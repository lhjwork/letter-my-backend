import nodemailer from "nodemailer";
import { ILetter } from "../models/Letter";

// 이메일 전송기 설정
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT || "587"),
  secure: false, // true for 465, false for other ports
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

/**
 * 편지 도착 알림 이메일 전송
 * @param receiverEmail - 받는 사람 이메일
 * @param letter - 편지 객체
 */
export async function sendEmailNotification(receiverEmail: string, letter: ILetter): Promise<void> {
  // 이메일 알림이 비활성화된 경우 스킵
  if (process.env.ENABLE_EMAIL_NOTIFICATIONS !== "true") {
    return;
  }

  try {
    const frontendUrl = process.env.FRONTEND_URL || "http://localhost:3000";
    const letterUrl = `${frontendUrl}/letter/${letter._id}`;

    const mailOptions = {
      from: process.env.SMTP_FROM || process.env.SMTP_USER,
      to: receiverEmail,
      subject: `💌 새로운 편지가 도착했습니다: ${letter.title}`,
      html: generateEmailTemplate(letter, letterUrl),
    };

    await transporter.sendMail(mailOptions);
  } catch (error) {
    console.error("이메일 전송 실패:", error);
    throw error;
  }
}

/**
 * 이메일 HTML 템플릿 생성
 * @param letter - 편지 객체
 * @param letterUrl - 편지 읽기 URL
 * @returns HTML 템플릿
 */
function generateEmailTemplate(letter: ILetter, letterUrl: string): string {
  return `
    <div style="max-width: 600px; margin: 0 auto; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f8f9fa;">
      <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px 20px; text-align: center;">
        <h1 style="color: white; margin: 0; font-size: 28px; font-weight: 300;">💌 Letter Community</h1>
        <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0 0; font-size: 16px;">새로운 편지가 도착했습니다!</p>
      </div>
      
      <div style="background: white; padding: 40px 30px; margin: 0;">
        <div style="background: #f8f9fa; padding: 30px; border-radius: 12px; border-left: 4px solid #667eea;">
          <h2 style="margin: 0 0 15px 0; color: #2c3e50; font-size: 22px; font-weight: 600;">
            ${letter.title}
          </h2>
          <p style="color: #6c757d; margin: 0; font-size: 16px; line-height: 1.6;">
            ${letter.ogPreviewText || letter.content.slice(0, 100) + "..."}
          </p>
          <div style="margin-top: 20px; padding-top: 20px; border-top: 1px solid #e9ecef;">
            <p style="margin: 0; color: #868e96; font-size: 14px;">
              <strong>작성자:</strong> ${letter.authorName}
            </p>
          </div>
        </div>
        
        <div style="text-align: center; margin: 40px 0;">
          <a href="${letterUrl}" 
             style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); 
                    color: white; 
                    padding: 15px 30px; 
                    text-decoration: none; 
                    border-radius: 25px; 
                    display: inline-block; 
                    font-weight: 600; 
                    font-size: 16px;
                    box-shadow: 0 4px 15px rgba(102, 126, 234, 0.3);
                    transition: all 0.3s ease;">
            편지 읽기 📖
          </a>
        </div>
        
        <div style="border-top: 1px solid #e9ecef; padding-top: 20px; text-align: center;">
          <p style="color: #adb5bd; font-size: 12px; margin: 0; line-height: 1.5;">
            이 메일은 Letter Community에서 자동으로 발송되었습니다.<br>
            더 이상 알림을 받고 싶지 않으시면 
            <a href="${process.env.FRONTEND_URL}/settings" style="color: #667eea;">설정</a>에서 변경하실 수 있습니다.
          </p>
        </div>
      </div>
    </div>
  `;
}

/**
 * 이메일 전송기 연결 테스트
 */
export async function testEmailConnection(): Promise<boolean> {
  try {
    await transporter.verify();
    return true;
  } catch (error) {
    console.error("이메일 서버 연결 실패:", error);
    return false;
  }
}
