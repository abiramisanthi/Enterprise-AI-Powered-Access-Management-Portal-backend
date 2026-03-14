import nodemailer from 'nodemailer';

const sendEmail = async (options) => {
    // 1. Create a transporter
    const transporter = nodemailer.createTransport({
        service: 'gmail', // You can change this to another service like SendGrid, Mailgun, etc.
        auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASS
        }
    });

    // 2. Define the email options
    const mailOptions = {
        from: `Access Portal <${process.env.EMAIL_USER}>`,
        to: options.email,
        subject: options.subject,
        text: options.message
    };

    // 3. Actually send the email
    await transporter.sendMail(mailOptions);
};

export default sendEmail;
