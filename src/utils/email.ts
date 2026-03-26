import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
});

interface MailOptions { to: string; subject: string; html: string; }

export const sendEmail = async (opts: MailOptions) => {
  await transporter.sendMail({ from: process.env.SMTP_FROM, ...opts });
};

export const sendSubscriptionEmail = (to: string, plan: string, endDate: Date) =>
  sendEmail({
    to,
    subject: "🎉 Welcome to Digital Heroes Golf — Subscription Confirmed",
    html: `
      <div style="font-family:sans-serif;max-width:600px;margin:auto;padding:32px;background:#f9f9f9;border-radius:12px">
        <h1 style="color:#1a1a1a">You're in! 🏌️</h1>
        <p style="color:#444;font-size:16px">Your <b>${plan}</b> subscription is now active.</p>
        <div style="background:#fff;border-radius:8px;padding:20px;margin:24px 0">
          <p style="margin:0;color:#666">Plan: <b style="color:#1a1a1a">${plan}</b></p>
          <p style="margin:8px 0 0;color:#666">Next renewal: <b style="color:#1a1a1a">${endDate.toDateString()}</b></p>
        </div>
        <p style="color:#444">You can now enter your golf scores, participate in monthly draws, and support your chosen charity.</p>
        <a href="${process.env.FRONTEND_URL}/dashboard" style="display:inline-block;background:#1a1a1a;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:bold;margin-top:16px">Go to Dashboard →</a>
        <p style="color:#999;font-size:12px;margin-top:32px">Digital Heroes Golf · digitalheroes.co.in</p>
      </div>
    `,
  });

export const sendDrawResultEmail = (to: string, month: number, year: number, numbers: number[]) =>
  sendEmail({
    to, subject: `Draw Results — ${month}/${year}`,
    html: `<h2>Monthly Draw Results</h2><p>Winning numbers: <b>${numbers.join(", ")}</b></p>`,
  });

export const sendWinnerEmail = (to: string, amount: number, matchType: string) =>
  sendEmail({
    to, subject: "🏆 You Won!",
    html: `<h2>Congratulations!</h2><p>You matched <b>${matchType}</b> and won <b>£${amount}</b>!</p><p>Please upload your proof to claim your prize.</p>`,
  });
