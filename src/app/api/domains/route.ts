import { NextResponse } from "next/server";

export async function GET() {
  const domainName = process.env.DOMAIN || "thelol.me";
  
  return NextResponse.json({
    "@context": "/contexts/Domain",
    "@id": "/domains",
    "@type": "hydra:Collection",
    "hydra:member": [
      {
        "@id": "/domains/1",
        "@type": "Domain",
        "id": "1",
        "domain": domainName,
        "isActive": true,
        "isPrivate": false,
        "createdAt": "2024-01-01T00:00:00+00:00",
        "updatedAt": "2024-01-01T00:00:00+00:00"
      }
    ],
    "hydra:totalItems": 1
  });
}
