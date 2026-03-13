import nodemailer from 'nodemailer';

export async function sendPasswordResetEmail(to: string, resetUrl: string): Promise<void> {
  // Dev fallback: log to console if no SMTP configured
  if (!process.env.EMAIL_HOST) {
    console.log(`\n[DEV] Réinitialisation mdp pour ${to}:\n${resetUrl}\n`);
    return;
  }

  const transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port: Number(process.env.EMAIL_PORT ?? 587),
    secure: process.env.EMAIL_PORT === '465',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
    tls: { rejectUnauthorized: false },
  });

  await transporter.sendMail({
    from: `"NutriLens" <${process.env.EMAIL_FROM ?? process.env.EMAIL_USER}>`,
    to,
    subject: 'Réinitialisation de votre mot de passe NutriLens',
    html: `
      <div style="font-family:system-ui,sans-serif;max-width:480px;margin:0 auto;background:#08080F;color:#EDE8FF;padding:32px;border-radius:16px">
        <h1 style="font-size:20px;font-weight:700;margin:0 0 8px">NutriLens</h1>
        <p style="color:#9D80FF;font-size:13px;margin:0 0 24px">Réinitialisation de mot de passe</p>
        <p style="font-size:14px;line-height:1.6;margin:0 0 24px">
          Tu as demandé à réinitialiser ton mot de passe. Clique sur le bouton ci-dessous — ce lien est valable <strong>1 heure</strong>.
        </p>
        <a href="${resetUrl}" style="display:inline-block;background:#7C3AED;color:#fff;font-weight:700;font-size:14px;padding:12px 24px;border-radius:12px;text-decoration:none">
          Réinitialiser mon mot de passe
        </a>
        <p style="font-size:12px;color:#52507A;margin:24px 0 0">
          Si tu n'es pas à l'origine de cette demande, ignore cet email.
        </p>
      </div>
    `,
  });
}
