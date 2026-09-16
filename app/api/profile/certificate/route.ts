import { NextRequest, NextResponse } from "next/server";
import prisma from "@/app/lib/db"; // Adjust path to your Prisma client
import { writeFile, mkdir } from "fs/promises";
import path from "path";

interface CertificateMeta {
  id?: number | null;
  name: string;
  organisation: string;
  issue_date: string;
  document?: string | null;
}

export async function PATCH(req: NextRequest) {
  try {
    // 1. Next.js native FormData parser
    const formData = await req.formData();

    // 2. Extract JSON metadata
    const rawCertificates = formData.get("certificates") as string;
    const certificatesMeta: CertificateMeta[] = JSON.parse(
      rawCertificates || "[]",
    );

    // Placeholder for auth user ID (replace with your auth session e.g. NextAuth/Kinde/Clerk)
    const userId = 1;

    // Ensure local upload directory exists
    const uploadDir = path.join(process.cwd(), "public/uploads/certificates");
    await mkdir(uploadDir, { recursive: true });

    // 3. Process database changes inside a Prisma Transaction
    const updatedCertificates = await prisma.$transaction(async (tx) => {
      // Find existing certificates to clean up removed entries
      const existingCerts = await tx.certificate.findMany({
        where: { userId },
        select: { id: true },
      });
      const existingIds = existingCerts.map((c) => c.id);

      const incomingIds = certificatesMeta
        .map((c) => c.id)
        .filter((id): id is number => typeof id === "number");

      // Delete items removed in UI
      const idsToDelete = existingIds.filter((id) => !incomingIds.includes(id));
      if (idsToDelete.length > 0) {
        await tx.certificate.deleteMany({
          where: { id: { in: idsToDelete } },
        });
      }

      // Upsert (Update or Create) each certificate
      const results = [];
      for (let i = 0; i < certificatesMeta.length; i++) {
        const cert = certificatesMeta[i];

        // Grab dynamic binary file key from FormData
        const file = formData.get(`document_${i}`) as File | null;
        let documentUrl = cert.document || null;

        // If a new binary File was uploaded, write it to disk
        if (file && file.size > 0) {
          const bytes = await file.arrayBuffer();
          const buffer = Buffer.from(bytes);

          const uniqueFilename = `${Date.now()}-${Math.round(Math.random() * 1e9)}${path.extname(file.name)}`;
          const filePath = path.join(uploadDir, uniqueFilename);

          await writeFile(filePath, buffer);
          documentUrl = `/uploads/certificates/${uniqueFilename}`;
        }

        if (cert.id) {
          // Update existing
          const updated = await tx.certificate.update({
            where: { id: cert.id },
            data: {
              name: cert.name,
              organisation: cert.organisation,
              issueDate: cert.issue_date,
              documentUrl: documentUrl,
            },
          });
          results.push(updated);
        } else {
          // Create new
          const created = await tx.certificate.create({
            data: {
              userId: userId,
              name: cert.name,
              organisation: cert.organisation,
              issueDate: cert.issue_date,
              documentUrl: documentUrl,
            },
          });
          results.push(created);
        }
      }

      return results;
    });

    return NextResponse.json({
      message: "Certificates updated successfully",
      certificates: updatedCertificates,
    });
  } catch (error) {
    console.error("Error saving certificates:", error);
    return NextResponse.json(
      { error: "Failed to update certificates" },
      { status: 500 },
    );
  }
}
