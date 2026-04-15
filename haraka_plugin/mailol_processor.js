// ==========================================================
// Haraka Plugin: mailol_processor
// Hooks into haraka transaction queue to process incoming mail.
// Save this file to your haraka/plugins/ directory.
// ==========================================================

const simpleParser = require('mailparser').simpleParser;
const Redis = require('ioredis');
const { v4: uuidv4 } = require('uuid');

let redis;
let publisher;

exports.register = function () {
    const plugin = this;
    
    // Initialize Redis connections
    const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
    redis = new Redis(redisUrl);
    publisher = new Redis(redisUrl);

    plugin.loginfo("Mailol Processor Plugin initialized against Redis");
}

exports.hook_data = function (next, connection) {
    connection.transaction.parse_body = true; // Tell haraka to parse
    next();
}

exports.hook_data_post = function (next, connection) {
    const plugin = this;
    const txn = connection.transaction;

    // Get recipients
    const toLinks = txn.rcpt_to;
    if (!toLinks || toLinks.length === 0) {
        return next();
    }

    // Convert raw message stream to buffer for simpleParser
    const stream = txn.message_stream;
    let buffer = '';

    stream.on('data', function (chunk) {
        buffer += chunk;
    });

    stream.on('end', function () {
        simpleParser(buffer, async (err, parsed) => {
            if (err) {
                plugin.logerror("Failed to parse email: " + err.message);
                return next();
            }

            try {
               await processParsedEmail(parsed, toLinks, txn, plugin);
            } catch(e) {
               plugin.logerror("Failed saving email to redis: " + e.message);
            }
            
            // Allow the transaction to complete mapping (Optional: send OK or Reject)
            // By returning next(), Haraka considers it delivered/accepted.
            next();
        });
    });
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
                   await redis.setBuffer(`attachment:${id}:${i}`, att.content, 'EX', 86400);
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
             "size": Buffer.byteLength(txn.body.bodytext || '', 'utf8'), 
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
        await redis.set(`message:${id}`, JSON.stringify(message), 'EX', 86400);
        
        // 3. Save raw payload explicitly isolated
        const rawContent = parsed.html || parsed.textAsHtml || parsed.text || "<p>No content given.</p>";
        await redis.set(`message_body:${id}`, rawContent, 'EX', 86400);

        // 4. Send EventStream Trigger mapped back to our Next.js edge listener
        const eventPayload = JSON.stringify({
             type: "message_created",
             message: message
        });
        await publisher.publish(`channel:${address}`, eventPayload);
        
        plugin.loginfo(`Successfully processed and routed inbound local email to: ${address}`);
    }
}
