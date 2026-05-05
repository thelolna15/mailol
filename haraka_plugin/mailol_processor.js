// ==========================================================
// Haraka Plugin: mailol_processor
// Hooks into haraka transaction queue to process incoming mail.
// Save this file to your haraka/plugins/ directory.
// ==========================================================

const simpleParser = require('mailparser').simpleParser;
const Redis = require('ioredis');
const { v4: uuidv4 } = require('uuid');
const nodemailer = require('nodemailer');

let redis;
let publisher;
let forwardTransporter;

const FORWARD_USER = process.env.GMAIL_FORWARD_USER || 'codingberes@gmail.com';
const FORWARD_APP_PASSWORD = process.env.GMAIL_FORWARD_APP_PASSWORD || '';
const GMAIL_ADDRESS_REGEX = /^[^\s@]+@gmail\.com$/i;

exports.register = function () {
    const plugin = this;
    
    // Initialize Redis connections
    const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
    redis = new Redis(redisUrl);
    publisher = new Redis(redisUrl);

    redis.on('error', (err) => {
        plugin.logerror("Redis connection error: " + err.message);
    });

    plugin.loginfo("Mailol Processor Plugin initialized against Redis");
}

exports.hook_data = function (next, connection) {
    connection.transaction.parse_body = true; // Tell haraka to parse
    next();
}

// Tell Haraka the message is "queued" — we already stored it in Redis during data_post
exports.hook_queue = function (next, connection) {
    next(OK);
}

exports.hook_data_post = function (next, connection) {
    const plugin = this;
    const txn = connection.transaction;

    // Get recipients
    const toLinks = txn.rcpt_to;
    if (!toLinks || toLinks.length === 0) {
        return next();
    }

    // Collect raw email data from Haraka's message_stream using get_data
    const chunks = [];

    txn.message_stream.pipe(
        new (require('stream').Writable)({
            write(chunk, encoding, callback) {
                chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk);
                callback();
            },
            final(callback) {
                const rawEmail = Buffer.concat(chunks);
                
                simpleParser(rawEmail)
                    .then((parsed) => {
                        return processParsedEmail(parsed, toLinks, txn, plugin);
                    })
                    .then(() => {
                        next(OK);
                    })
                    .catch((err) => {
                        plugin.logerror("Failed to process email: " + err.message);
                        next();
                    });
                
                callback();
            }
        })
    );
}

async function processParsedEmail(parsed, toLinks, txn, plugin) {
    // Determine target valid user addresses
    // For every recipient, check if they exist in Redis
    for (const rcpt of toLinks) {
        const address = rcpt.address().toLowerCase();
        
        // Ensure user exists
        const exists = await redis.exists(`user:${address}`);
        if (!exists) continue; // Drop silently for unregistered addresses (Zero-friction bounce)

        const id = uuidv4();
        const accountStr = await redis.get(`user:${address}`);
        const account = JSON.parse(accountStr);

        const timestamp = new Date().toISOString();

        // Extrapolate structural data
        const fromData = parsed.from && parsed.from.value && parsed.from.value[0] ? parsed.from.value[0] : { address: "unknown", name: "Unknown" };
        
        // Extrapolate attachments
        const attachmentMetadata = [];
        if (parsed.attachments && parsed.attachments.length > 0) {
            for (let i = 0; i < parsed.attachments.length; i++) {
                const att = parsed.attachments[i];
                attachmentMetadata.push({
                   filename: att.filename || `attachment-${i}`,
                   size: att.size || (att.content ? Buffer.byteLength(att.content) : 0),
                   contentType: att.contentType || 'application/octet-stream',
                   index: i
                });
                if (att.content) {
                   // Store attachment as base64 string with TTL
                   await redis.setex(`attachment:${id}:${i}`, 86400, att.content.toString('base64'));
                }
            }
        }
        
        const message = {
             "@context": "/contexts/Message",
             "@type": "Message",
             "id": id,
             "accountId": account.id,
             "msgid": parsed.messageId || `<${uuidv4()}@mailol>`,
             "from": {
                 "address": fromData.address,
                 "name": fromData.name
             },
             "to": [{ "address": address, "name": "" }],
             "subject": parsed.subject || "(No Subject)",
             "intro": parsed.text ? parsed.text.substring(0, 100).replace(/\n/g, ' ') : "...",
             "seen": false,
             "isDeleted": false,
             "hasAttachments": attachmentMetadata.length > 0,
             "attachments": attachmentMetadata,
             "size": Buffer.byteLength(parsed.html || parsed.text || '', 'utf8'), 
             "downloadUrl": `/messages/${id}/download`,
             "createdAt": timestamp,
             "updatedAt": timestamp
        };

        // 1. ZADD indexing
        await redis.zadd(`inbox:${address}`, Date.now(), id);

        // 1.5. Limit Inbox Size to 50 messages max for 5MB footprint safety
        const count = await redis.zcard(`inbox:${address}`);
        if (count > 50) {
            const evictedIds = await redis.zrange(`inbox:${address}`, 0, count - 51);
            if (evictedIds && evictedIds.length > 0) {
                for (const evictId of evictedIds) {
                    await redis.del(`message:${evictId}`);
                    await redis.del(`message_body:${evictId}`);
                }
                await redis.zremrangebyrank(`inbox:${address}`, 0, count - 51);
            }
        }
        
        // 2. Save document metadata
        await redis.setex(`message:${id}`, 86400, JSON.stringify(message));
        
        // 3. Save raw payload explicitly isolated
        const rawContent = parsed.html || parsed.textAsHtml || parsed.text || "<p>No content given.</p>";
        await redis.setex(`message_body:${id}`, 86400, rawContent);

        // 4. Send EventStream Trigger mapped back to our Next.js edge listener
        const eventPayload = JSON.stringify({
             type: "message_created",
             message: message
        });
        await publisher.publish(`channel:${address}`, eventPayload);

        // 5. Forward every inbound message to mapped Gmail recipients, if any.
        try {
            await forwardInboundEmail(parsed, address, fromData, rawContent, plugin);
        } catch (err) {
            plugin.logerror(`Failed to forward inbound email for ${address}: ${err.message}`);
        }
        
        plugin.loginfo(`Successfully processed and routed inbound local email to: ${address}`);
    }
}

function getForwardTransporter(plugin) {
    if (!FORWARD_APP_PASSWORD) {
        return null;
    }

    if (!forwardTransporter) {
        forwardTransporter = nodemailer.createTransport({
            host: 'smtp.gmail.com',
            port: 465,
            secure: true,
            auth: {
                user: FORWARD_USER,
                pass: FORWARD_APP_PASSWORD
            }
        });
        plugin.loginfo(`Mailol forwarding initialized with Gmail relay account: ${FORWARD_USER}`);
    }

    return forwardTransporter;
}

async function getForwardRecipients(address) {
    const forwardingStr = await redis.get(`forward:${address}`);
    if (!forwardingStr) return [];

    try {
        const forwarding = JSON.parse(forwardingStr);
        if (!Array.isArray(forwarding.recipients)) return [];

        return Array.from(new Set(
            forwarding.recipients
                .filter((recipient) => typeof recipient === 'string')
                .map((recipient) => recipient.trim().toLowerCase())
                .filter((recipient) => GMAIL_ADDRESS_REGEX.test(recipient))
        ));
    } catch (err) {
        return [];
    }
}

async function forwardInboundEmail(parsed, address, fromData, rawContent, plugin) {
    const recipients = await getForwardRecipients(address);
    if (recipients.length === 0) return;

    const transporter = getForwardTransporter(plugin);
    if (!transporter) {
        plugin.logerror(`Forwarding configured for ${address}, but GMAIL_FORWARD_APP_PASSWORD is not set.`);
        return;
    }

    const originalFrom = fromData.name
        ? `${fromData.name} <${fromData.address}>`
        : fromData.address;
    const textBody = parsed.text || 'No plain text content given.';
    const htmlBody = parsed.html || parsed.textAsHtml || `<pre>${escapeHtml(textBody)}</pre>`;

    const attachments = (parsed.attachments || [])
        .filter((att) => att && att.content)
        .map((att, index) => ({
            filename: att.filename || `attachment-${index}`,
            content: att.content,
            contentType: att.contentType || 'application/octet-stream'
        }));

    await transporter.sendMail({
        from: `"MaiLoL Forwarder" <${FORWARD_USER}>`,
        to: recipients,
        replyTo: fromData.address || undefined,
        subject: parsed.subject || '(No Subject)',
        text: [
            `Forwarded from: ${originalFrom}`,
            `Forwarded to temp: ${address}`,
            '',
            textBody
        ].join('\n'),
        html: [
            '<div style="font-family:Arial,sans-serif;font-size:13px;color:#444;border-bottom:1px solid #ddd;padding-bottom:12px;margin-bottom:16px">',
            `<div><strong>Forwarded from:</strong> ${escapeHtml(originalFrom)}</div>`,
            `<div><strong>Forwarded to temp:</strong> ${escapeHtml(address)}</div>`,
            '</div>',
            htmlBody || rawContent
        ].join(''),
        attachments
    });

    plugin.loginfo(`Forwarded inbound email for ${address} to ${recipients.join(', ')}`);
}

function escapeHtml(value) {
    return String(value)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}
