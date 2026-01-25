// LINE Bot Service - ส่งข้อความผ่าน LINE Messaging API
import crypto from 'crypto';

interface LineProfile {
  userId: string;
  displayName: string;
  pictureUrl?: string;
  statusMessage?: string;
  language?: string;
}

interface SendMessageResult {
  success: boolean;
  error?: string;
}

export class LineBotService {
  private accessToken: string;
  private channelSecret: string;

  constructor(accessToken: string, channelSecret: string) {
    this.accessToken = accessToken;
    this.channelSecret = channelSecret;
  }

  // Verify LINE webhook signature
  verifySignature(body: string, signature: string): boolean {
    const hash = crypto
      .createHmac('sha256', this.channelSecret)
      .update(body)
      .digest('base64');
    return hash === signature;
  }

  // Get user profile
  async getProfile(userId: string): Promise<LineProfile | null> {
    try {
      const response = await fetch(`https://api.line.me/v2/bot/profile/${userId}`, {
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
        },
      });

      if (!response.ok) {
        console.error('Failed to get LINE profile:', response.status);
        return null;
      }

      return await response.json();
    } catch (error) {
      console.error('Error getting LINE profile:', error);
      return null;
    }
  }

  // Send text message
  async sendTextMessage(userId: string, text: string): Promise<SendMessageResult> {
    return this.pushMessage(userId, [{ type: 'text', text }]);
  }

  // Send sticker
  async sendSticker(userId: string, packageId: string, stickerId: string): Promise<SendMessageResult> {
    return this.pushMessage(userId, [{ type: 'sticker', packageId, stickerId }]);
  }

  // Send image
  async sendImage(userId: string, originalContentUrl: string, previewImageUrl?: string): Promise<SendMessageResult> {
    return this.pushMessage(userId, [{
      type: 'image',
      originalContentUrl,
      previewImageUrl: previewImageUrl || originalContentUrl,
    }]);
  }

  // Send multiple messages (up to 5)
  async sendMessages(userId: string, messages: LineMessage[]): Promise<SendMessageResult> {
    return this.pushMessage(userId, messages.slice(0, 5));
  }

  // Push message to user
  private async pushMessage(userId: string, messages: LineMessage[]): Promise<SendMessageResult> {
    try {
      const response = await fetch('https://api.line.me/v2/bot/message/push', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.accessToken}`,
        },
        body: JSON.stringify({
          to: userId,
          messages,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('LINE push message failed:', response.status, errorData);
        return { 
          success: false, 
          error: errorData.message || `HTTP ${response.status}` 
        };
      }

      return { success: true };
    } catch (error) {
      console.error('Error pushing LINE message:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }

  // Reply to message (use within webhook)
  async replyMessage(replyToken: string, messages: LineMessage[]): Promise<SendMessageResult> {
    try {
      const response = await fetch('https://api.line.me/v2/bot/message/reply', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.accessToken}`,
        },
        body: JSON.stringify({
          replyToken,
          messages: messages.slice(0, 5),
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('LINE reply message failed:', response.status, errorData);
        return { 
          success: false, 
          error: errorData.message || `HTTP ${response.status}` 
        };
      }

      return { success: true };
    } catch (error) {
      console.error('Error replying LINE message:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }

  // Get message content (for images, videos, etc.)
  async getMessageContent(messageId: string): Promise<ArrayBuffer | null> {
    try {
      const response = await fetch(`https://api-data.line.me/v2/bot/message/${messageId}/content`, {
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
        },
      });

      if (!response.ok) {
        console.error('Failed to get message content:', response.status);
        return null;
      }

      return await response.arrayBuffer();
    } catch (error) {
      console.error('Error getting message content:', error);
      return null;
    }
  }

  // Broadcast message to all followers
  async broadcast(messages: LineMessage[]): Promise<SendMessageResult> {
    try {
      const response = await fetch('https://api.line.me/v2/bot/message/broadcast', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.accessToken}`,
        },
        body: JSON.stringify({
          messages: messages.slice(0, 5),
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        return { 
          success: false, 
          error: errorData.message || `HTTP ${response.status}` 
        };
      }

      return { success: true };
    } catch (error) {
      console.error('Error broadcasting LINE message:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }

  // Get quota for this month
  async getQuota(): Promise<{ type: string; value: number } | null> {
    try {
      const response = await fetch('https://api.line.me/v2/bot/message/quota', {
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
        },
      });

      if (!response.ok) return null;
      return await response.json();
    } catch (error) {
      console.error('Error getting quota:', error);
      return null;
    }
  }
}

// LINE Message types
interface LineTextMessage {
  type: 'text';
  text: string;
}

interface LineStickerMessage {
  type: 'sticker';
  packageId: string;
  stickerId: string;
}

interface LineImageMessage {
  type: 'image';
  originalContentUrl: string;
  previewImageUrl: string;
}

interface LineVideoMessage {
  type: 'video';
  originalContentUrl: string;
  previewImageUrl: string;
}

interface LineAudioMessage {
  type: 'audio';
  originalContentUrl: string;
  duration: number;
}

interface LineLocationMessage {
  type: 'location';
  title: string;
  address: string;
  latitude: number;
  longitude: number;
}

type LineMessage = 
  | LineTextMessage 
  | LineStickerMessage 
  | LineImageMessage 
  | LineVideoMessage
  | LineAudioMessage
  | LineLocationMessage;

export type { LineMessage, LineProfile };
