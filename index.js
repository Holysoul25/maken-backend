require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { Resend } = require('resend');
const https = require('https');

const app = express();
const resend = new Resend(process.env.RESEND_API_KEY);

app.use(cors({ origin: 'https://maken.cl' }));
app.use(express.json());

app.post('/contacto', async (req, res) => {
  const { nombre, email, telefono, servicio, mensaje, captcha } = req.body;

  // Validación campos
  if (!nombre || !email || !servicio) {
    return res.status(400).json({ error: 'Faltan campos obligatorios' });
  }

  // Validación captcha
  if (!captcha) {
    return res.status(400).json({ error: 'Captcha requerido' });
  }

  const verifyURL = `https://api.hcaptcha.com/siteverify`;
  const params = new URLSearchParams({
    secret: process.env.HCAPTCHA_SECRET,
    response: captcha
  });

  const captchaRes = await fetch(verifyURL, {
    method: 'POST',
    body: params
  });
  const captchaData = await captchaRes.json();

  if (!captchaData.success) {
    return res.status(400).json({ error: 'Captcha inválido' });
  }


  try {
    // ── EMAIL 1: Notificación al dueño ──
    await resend.emails.send({
      from: 'Formulario Maken <noreply@maken.cl>',
      to: 'kevinalballay7@gmail.com',
      replyTo: email,
      subject: `Nueva cotización: ${servicio} — ${nombre}`,
      html: `
<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#f4f4f8;font-family:'Segoe UI',sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f8;padding:40px 20px">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08)">

        <!-- HEADER -->
        <tr>
          <td style="background:linear-gradient(135deg,#a020f0,#e040a0,#f5a623);padding:36px 40px;text-align:center">
            <h1 style="margin:0;color:#ffffff;font-size:26px;font-weight:900;letter-spacing:-0.5px">maken</h1>
            <p style="margin:6px 0 0;color:rgba(255,255,255,0.85);font-size:13px">Nueva solicitud de cotización</p>
          </td>
        </tr>

        <!-- BADGE SERVICIO -->
        <tr>
          <td style="padding:28px 40px 0;text-align:center">
            <span style="display:inline-block;background:#f3e8ff;color:#7c3aed;font-size:13px;font-weight:700;padding:6px 18px;border-radius:20px;letter-spacing:0.3px">
              ${servicio}
            </span>
          </td>
        </tr>

        <!-- DATOS -->
        <tr>
          <td style="padding:24px 40px 0">
            <table width="100%" cellpadding="0" cellspacing="0" style="border-radius:12px;overflow:hidden;border:1px solid #ede9f6">
              <tr style="background:#faf8ff">
                <td style="padding:14px 18px;font-size:12px;color:#9ca3af;font-weight:600;text-transform:uppercase;letter-spacing:0.8px;width:110px">Nombre</td>
                <td style="padding:14px 18px;font-size:15px;color:#1f2937;font-weight:700">${nombre}</td>
              </tr>
              <tr style="border-top:1px solid #ede9f6">
                <td style="padding:14px 18px;font-size:12px;color:#9ca3af;font-weight:600;text-transform:uppercase;letter-spacing:0.8px">Email</td>
                <td style="padding:14px 18px;font-size:15px;color:#7c3aed;font-weight:600">
                  <a href="mailto:${email}" style="color:#7c3aed;text-decoration:none">${email}</a>
                </td>
              </tr>
              <tr style="background:#faf8ff;border-top:1px solid #ede9f6">
                <td style="padding:14px 18px;font-size:12px;color:#9ca3af;font-weight:600;text-transform:uppercase;letter-spacing:0.8px">Teléfono</td>
                <td style="padding:14px 18px;font-size:15px;color:#1f2937">${telefono || '—'}</td>
              </tr>
              ${mensaje ? `
              <tr style="border-top:1px solid #ede9f6">
                <td colspan="2" style="padding:18px">
                  <p style="margin:0 0 8px;font-size:12px;color:#9ca3af;font-weight:600;text-transform:uppercase;letter-spacing:0.8px">Mensaje</p>
                  <p style="margin:0;font-size:14px;color:#374151;line-height:1.7;background:#f9fafb;padding:14px;border-radius:8px;border-left:3px solid #a020f0">${mensaje}</p>
                </td>
              </tr>` : ''}
            </table>
          </td>
        </tr>

        <!-- CTA RESPONDER -->
        <tr>
          <td style="padding:28px 40px">
            <a href="mailto:${email}?subject=Re: Cotización ${servicio} - Maken"
               style="display:block;background:linear-gradient(135deg,#a020f0,#e040a0);color:#ffffff;text-align:center;padding:14px;border-radius:10px;font-size:15px;font-weight:700;text-decoration:none">
              Responder a ${nombre} →
            </a>
          </td>
        </tr>

        <!-- FOOTER -->
        <tr>
          <td style="background:#faf8ff;border-top:1px solid #ede9f6;padding:20px 40px;text-align:center">
            <p style="margin:0;font-size:12px;color:#9ca3af">
              <strong style="color:#7c3aed">maken.cl</strong> · Santiago, Chile · Este correo fue generado automáticamente
            </p>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>
            `,
    });

    // ── EMAIL 2: Confirmación al cliente ──
    await resend.emails.send({
      from: 'Maken <hola@maken.cl>',
      to: email,
      subject: '¡Recibimos tu cotización! 🚀',
      html: `
<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#f4f4f8;font-family:'Segoe UI',sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f8;padding:40px 20px">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08)">

        <!-- HEADER -->
        <tr>
          <td style="background:linear-gradient(135deg,#a020f0,#e040a0,#f5a623);padding:36px 40px;text-align:center">
            <h1 style="margin:0;color:#ffffff;font-size:26px;font-weight:900">maken</h1>
            <p style="margin:6px 0 0;color:rgba(255,255,255,0.85);font-size:13px">Desarrollo Web & Apps Móviles · Santiago, Chile</p>
          </td>
        </tr>

        <!-- CUERPO -->
        <tr>
          <td style="padding:36px 40px">
            <h2 style="margin:0 0 12px;font-size:22px;color:#1f2937">¡Hola, ${nombre}! 👋</h2>
            <p style="margin:0 0 16px;font-size:15px;color:#4b5563;line-height:1.7">
              Recibimos tu solicitud para <strong style="color:#7c3aed">${servicio}</strong> y ya está en manos de nuestro equipo.
            </p>
            <p style="margin:0 0 28px;font-size:15px;color:#4b5563;line-height:1.7">
              Nos pondremos en contacto contigo en <strong>menos de 24 horas hábiles</strong> para conversar sobre tu proyecto y enviarte una propuesta detallada en CLP.
            </p>

            <!-- Caja resumen -->
            <table width="100%" cellpadding="0" cellspacing="0" style="background:#faf8ff;border:1px solid #ede9f6;border-radius:12px;margin-bottom:28px">
              <tr><td style="padding:16px 20px">
                <p style="margin:0 0 4px;font-size:11px;color:#9ca3af;font-weight:700;text-transform:uppercase;letter-spacing:0.8px">Resumen de tu solicitud</p>
                <p style="margin:0;font-size:15px;color:#1f2937"><strong>Servicio:</strong> ${servicio}</p>
                ${mensaje ? `<p style="margin:8px 0 0;font-size:14px;color:#6b7280">"${mensaje}"</p>` : ''}
              </td></tr>
            </table>

            <!-- Qué sigue -->
            <p style="margin:0 0 14px;font-size:13px;font-weight:700;color:#1f2937;text-transform:uppercase;letter-spacing:0.5px">¿Qué sigue?</p>
            <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:28px">
              <tr>
                <td style="padding:8px 0;vertical-align:top">
                  <span style="display:inline-block;background:linear-gradient(135deg,#a020f0,#e040a0);color:#fff;font-size:11px;font-weight:800;padding:3px 10px;border-radius:20px;margin-right:10px">01</span>
                  <span style="font-size:14px;color:#4b5563">Revisamos tu solicitud en detalle</span>
                </td>
              </tr>
              <tr>
                <td style="padding:8px 0;vertical-align:top">
                  <span style="display:inline-block;background:linear-gradient(135deg,#a020f0,#e040a0);color:#fff;font-size:11px;font-weight:800;padding:3px 10px;border-radius:20px;margin-right:10px">02</span>
                  <span style="font-size:14px;color:#4b5563">Te enviamos una cotización en CLP</span>
                </td>
              </tr>
              <tr>
                <td style="padding:8px 0;vertical-align:top">
                  <span style="display:inline-block;background:linear-gradient(135deg,#a020f0,#e040a0);color:#fff;font-size:11px;font-weight:800;padding:3px 10px;border-radius:20px;margin-right:10px">03</span>
                  <span style="font-size:14px;color:#4b5563">Agendamos una reunión sin costo</span>
                </td>
              </tr>
            </table>

            <!-- CTA WhatsApp -->
            <a href="https://wa.me/56912345678?text=Hola%2C%20acabo%20de%20enviar%20una%20cotizaci%C3%B3n%20en%20maken.cl"
               style="display:block;background:linear-gradient(135deg,#a020f0,#e040a0);color:#ffffff;text-align:center;padding:14px;border-radius:10px;font-size:15px;font-weight:700;text-decoration:none;margin-bottom:14px">
              ¿Urgente? Escríbenos por WhatsApp →
            </a>
            <p style="margin:0;font-size:13px;color:#9ca3af;text-align:center">También puedes responder este correo directamente</p>
          </td>
        </tr>

        <!-- FOOTER -->
        <tr>
          <td style="background:#faf8ff;border-top:1px solid #ede9f6;padding:20px 40px;text-align:center">
            <p style="margin:0;font-size:12px;color:#9ca3af">
              <strong style="color:#7c3aed">maken.cl</strong> · Santiago, Chile · Lunes a viernes 9:00–18:00
            </p>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>
            `,
    });

    res.json({ ok: true });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al enviar el correo' });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Maken API corriendo en puerto ${PORT}`));