import {
  generateRecaptchaToken,
  generateQrTicket,
} from "@/lib/server/cosmo/shop/qr-auth";

export async function GET() {
  const token = await generateRecaptchaToken();
  const ticket = await generateQrTicket(token);

  return Response.json({
    ticket,
  });
}
