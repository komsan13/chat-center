'use client';

import { useState, useRef, useEffect } from 'react';
import { 
  Sparkles, Download, RefreshCw, Type, Image as ImageIcon, 
  Palette, Loader2, Copy, Check, Trash2, Save, Plus,
  ChevronLeft, ChevronRight, Wand2, Layers
} from 'lucide-react';
import { useTheme } from '@/contexts/ThemeContext';

// Character templates
const characterTemplates = [
  { 
    id: 'shark-cat-blue', 
    name: 'ฉลามแมวฟ้า', 
    url: 'https://i.imgur.com/placeholder1.png',
    preview: '🦈💙'
  },
  { 
    id: 'shark-cat-pink', 
    name: 'ฉลามแมวชมพู', 
    url: 'https://i.imgur.com/placeholder2.png',
    preview: '🦈💖'
  },
  { 
    id: 'cute-bear', 
    name: 'หมีน้อย', 
    url: 'https://i.imgur.com/placeholder3.png',
    preview: '🐻'
  },
  { 
    id: 'bunny', 
    name: 'กระต่ายน้อย', 
    url: 'https://i.imgur.com/placeholder4.png',
    preview: '🐰'
  },
  { 
    id: 'cat', 
    name: 'แมวน้อย', 
    url: 'https://i.imgur.com/placeholder5.png',
    preview: '🐱'
  },
  { 
    id: 'dog', 
    name: 'หมาน้อย', 
    url: 'https://i.imgur.com/placeholder6.png',
    preview: '🐶'
  },
];

// Pre-made text templates
const textTemplates = [
  { text: 'เครดิตเข้าเรียบร้อยแล้วนะคะ', emoji: '💚' },
  { text: 'แอดตรวจสอบให้สักครู่ค่ะ', emoji: '🔍' },
  { text: 'ธนาคารดีเลย์ กรุณารอสักครู่นะคะ', emoji: '⏳' },
  { text: 'เฮงๆรวยๆแตกเยอะๆนะคะ', emoji: '🍀' },
  { text: 'ใจเย็นๆนะคะ', emoji: '😊' },
  { text: 'สู้ๆ แอดมินเป็นกำลังใจให้นะคะ', emoji: '💪' },
  { text: 'ทำรายการให้เรียบร้อย ขออภัยในความล่าช้าค่ะ', emoji: '🙏' },
  { text: 'สวัสดีค่า ทำรายการอะไรดีคะ', emoji: '👋' },
  { text: 'เครดิตเข้าแล้ว เฮงๆปังๆน๊า', emoji: '🎉' },
  { text: 'แจ้งสลิปให้แอดมินด้วยน๊า', emoji: '📝' },
  { text: 'รอสักครู่ อยู่ระหว่างดำเนินการนะคะ', emoji: '⏱️' },
  { text: 'ขออภัยด้วยน๊า', emoji: '🙇' },
  { text: 'แคปหน้าจอให้แอดหน่อยน๊า', emoji: '📱' },
  { text: 'แจ้งข้อมูลให้ครบด้วยนะคะ', emoji: '📋' },
  { text: 'ไม่ใช่สลิปของทางเรานะคะ', emoji: '❌' },
  { text: '1 ไลน์ ต่อ 1 ยูส ค่ะ', emoji: '☝️' },
  { text: 'ห้องเกมปิดปรับปรุงชั่วคราวค่า', emoji: '🔧' },
  { text: 'แอดมินยินดีให้บริการค่า', emoji: '💝' },
];

// Font styles
const fontStyles = [
  { id: 'noto-thai', name: 'Noto Sans Thai', fontFamily: "'Noto Sans Thai', sans-serif" },
  { id: 'sarabun', name: 'Sarabun', fontFamily: "'Sarabun', sans-serif" },
  { id: 'prompt', name: 'Prompt', fontFamily: "'Prompt', sans-serif" },
  { id: 'kanit', name: 'Kanit', fontFamily: "'Kanit', sans-serif" },
  { id: 'mali', name: 'Mali (Hand)', fontFamily: "'Mali', cursive" },
  { id: 'charm', name: 'Charm (Cute)', fontFamily: "'Charm', cursive" },
];

// Text colors
const textColors = [
  { id: 'black', name: 'ดำ', color: '#1a1a1a' },
  { id: 'white', name: 'ขาว', color: '#ffffff', stroke: '#333' },
  { id: 'pink', name: 'ชมพู', color: '#ec4899' },
  { id: 'blue', name: 'ฟ้า', color: '#3b82f6' },
  { id: 'green', name: 'เขียว', color: '#22c55e' },
  { id: 'orange', name: 'ส้ม', color: '#f97316' },
  { id: 'purple', name: 'ม่วง', color: '#a855f7' },
  { id: 'red', name: 'แดง', color: '#ef4444' },
];

interface GeneratedSticker {
  id: string;
  imageUrl: string;
  text: string;
  createdAt: Date;
}

export default function StickerGeneratorPage() {
  const { isDark } = useTheme();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  // States
  const [selectedCharacter, setSelectedCharacter] = useState(characterTemplates[0]);
  const [stickerText, setStickerText] = useState('สวัสดีค่า');
  const [selectedFont, setSelectedFont] = useState(fontStyles[0]);
  const [selectedColor, setSelectedColor] = useState(textColors[0]);
  const [fontSize, setFontSize] = useState(32);
  const [textPosition, setTextPosition] = useState({ x: 50, y: 85 }); // percentage
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedStickers, setGeneratedStickers] = useState<GeneratedSticker[]>([]);
  const [activeTab, setActiveTab] = useState<'create' | 'templates' | 'saved'>('create');
  const [previewMode, setPreviewMode] = useState(true);
  
  // Theme colors
  const colors = {
    bgPrimary: isDark ? '#0f1419' : '#ffffff',
    bgSecondary: isDark ? '#1a1f2e' : '#f8fafc',
    bgTertiary: isDark ? '#242c3d' : '#f1f5f9',
    bgCard: isDark ? '#1e2738' : '#ffffff',
    border: isDark ? '#2d3748' : '#e2e8f0',
    textPrimary: isDark ? '#f1f5f9' : '#1e293b',
    textSecondary: isDark ? '#94a3b8' : '#64748b',
    textMuted: isDark ? '#64748b' : '#94a3b8',
    accent: '#06C755',
    accentHover: '#05a648',
    accentLight: isDark ? 'rgba(6, 199, 85, 0.15)' : 'rgba(6, 199, 85, 0.1)',
    gradient: 'linear-gradient(135deg, #06C755 0%, #00B900 100%)',
  };

  // Load Google Fonts
  useEffect(() => {
    const link = document.createElement('link');
    link.href = 'https://fonts.googleapis.com/css2?family=Noto+Sans+Thai:wght@400;500;600;700&family=Sarabun:wght@400;500;600;700&family=Prompt:wght@400;500;600;700&family=Kanit:wght@400;500;600;700&family=Mali:wght@400;500;600;700&family=Charm:wght@400;700&display=swap';
    link.rel = 'stylesheet';
    document.head.appendChild(link);
  }, []);

  // Generate sticker preview
  const generatePreview = async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Draw background (for preview)
    ctx.fillStyle = '#f0f0f0';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Draw placeholder character
    ctx.fillStyle = '#e0e0e0';
    ctx.beginPath();
    ctx.arc(canvas.width / 2, canvas.height / 2 - 30, 120, 0, Math.PI * 2);
    ctx.fill();
    
    // Draw character emoji placeholder
    ctx.font = '80px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(selectedCharacter.preview, canvas.width / 2, canvas.height / 2);
    
    // Draw text
    ctx.font = `${fontSize}px ${selectedFont.fontFamily}`;
    ctx.textAlign = 'center';
    ctx.fillStyle = selectedColor.color;
    
    // Add stroke for light colors
    if (selectedColor.stroke) {
      ctx.strokeStyle = selectedColor.stroke;
      ctx.lineWidth = 3;
      ctx.strokeText(stickerText, (canvas.width * textPosition.x) / 100, (canvas.height * textPosition.y) / 100);
    }
    
    ctx.fillText(stickerText, (canvas.width * textPosition.x) / 100, (canvas.height * textPosition.y) / 100);
  };

  useEffect(() => {
    if (previewMode) {
      generatePreview();
    }
  }, [selectedCharacter, stickerText, selectedFont, selectedColor, fontSize, textPosition, previewMode]);

  // Generate with AI
  const generateWithAI = async () => {
    setIsGenerating(true);
    
    try {
      // For now, simulate AI generation
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Create a generated sticker
      const newSticker: GeneratedSticker = {
        id: `sticker-${Date.now()}`,
        imageUrl: canvasRef.current?.toDataURL() || '',
        text: stickerText,
        createdAt: new Date(),
      };
      
      setGeneratedStickers(prev => [newSticker, ...prev]);
      
      alert('🎉 สร้าง Sticker สำเร็จ!\n\nหมายเหตุ: ฟีเจอร์ AI Generation ต้องตั้งค่า API Key ก่อน');
    } catch (error) {
      console.error('Generation error:', error);
      alert('เกิดข้อผิดพลาด กรุณาลองใหม่');
    } finally {
      setIsGenerating(false);
    }
  };

  // Download sticker
  const downloadSticker = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const link = document.createElement('a');
    link.download = `sticker-${Date.now()}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
  };

  return (
    <div style={{ 
      minHeight: '100vh', 
      background: colors.bgPrimary,
      padding: '24px',
    }}>
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
          <div style={{
            width: 48, height: 48, borderRadius: 12,
            background: colors.gradient,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 4px 16px rgba(6, 199, 85, 0.3)',
          }}>
            <Sparkles size={24} color="#fff" />
          </div>
          <div>
            <h1 style={{ fontSize: 24, fontWeight: 700, color: colors.textPrimary, margin: 0 }}>
              Sticker Generator
            </h1>
            <p style={{ fontSize: 14, color: colors.textSecondary, margin: 0 }}>
              สร้าง Sticker สำหรับตอบแชทลูกค้า
            </p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ 
        display: 'flex', gap: 8, marginBottom: 24,
        borderBottom: `1px solid ${colors.border}`,
        paddingBottom: 12,
      }}>
        {[
          { id: 'create', label: 'สร้าง Sticker', icon: Wand2 },
          { id: 'templates', label: 'ข้อความสำเร็จรูป', icon: Layers },
          { id: 'saved', label: 'Sticker ที่บันทึก', icon: Save },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as typeof activeTab)}
            style={{
              padding: '10px 20px', borderRadius: 8,
              background: activeTab === tab.id ? colors.accentLight : 'transparent',
              border: activeTab === tab.id ? `1px solid ${colors.accent}40` : `1px solid transparent`,
              color: activeTab === tab.id ? colors.accent : colors.textSecondary,
              fontSize: 14, fontWeight: 600, cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: 8,
              transition: 'all 0.2s ease',
            }}
          >
            <tab.icon size={18} />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Main Content */}
      <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
        {/* Left Panel - Editor */}
        <div style={{ 
          flex: '1 1 400px', 
          maxWidth: 600,
          background: colors.bgCard, 
          borderRadius: 16, 
          padding: 24,
          border: `1px solid ${colors.border}`,
        }}>
          {activeTab === 'create' && (
            <>
              {/* Character Selection */}
              <div style={{ marginBottom: 24 }}>
                <label style={{ 
                  display: 'block', fontSize: 14, fontWeight: 600, 
                  color: colors.textPrimary, marginBottom: 12 
                }}>
                  🎨 เลือกตัวละคร
                </label>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {characterTemplates.map((char) => (
                    <button
                      key={char.id}
                      onClick={() => setSelectedCharacter(char)}
                      style={{
                        width: 70, height: 70, borderRadius: 12,
                        background: selectedCharacter.id === char.id 
                          ? colors.accentLight 
                          : colors.bgTertiary,
                        border: selectedCharacter.id === char.id 
                          ? `2px solid ${colors.accent}` 
                          : `1px solid ${colors.border}`,
                        cursor: 'pointer',
                        display: 'flex', flexDirection: 'column',
                        alignItems: 'center', justifyContent: 'center', gap: 4,
                        transition: 'all 0.2s ease',
                      }}
                    >
                      <span style={{ fontSize: 28 }}>{char.preview}</span>
                      <span style={{ fontSize: 10, color: colors.textMuted }}>{char.name}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Text Input */}
              <div style={{ marginBottom: 24 }}>
                <label style={{ 
                  display: 'block', fontSize: 14, fontWeight: 600, 
                  color: colors.textPrimary, marginBottom: 12 
                }}>
                  ✏️ ข้อความ
                </label>
                <textarea
                  value={stickerText}
                  onChange={(e) => setStickerText(e.target.value)}
                  placeholder="พิมพ์ข้อความที่ต้องการ..."
                  style={{
                    width: '100%', padding: 14, borderRadius: 10,
                    border: `1px solid ${colors.border}`,
                    background: colors.bgSecondary,
                    color: colors.textPrimary,
                    fontSize: 16, resize: 'none', height: 80,
                    fontFamily: selectedFont.fontFamily,
                  }}
                />
              </div>

              {/* Font Selection */}
              <div style={{ marginBottom: 24 }}>
                <label style={{ 
                  display: 'block', fontSize: 14, fontWeight: 600, 
                  color: colors.textPrimary, marginBottom: 12 
                }}>
                  🔤 รูปแบบตัวอักษร
                </label>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {fontStyles.map((font) => (
                    <button
                      key={font.id}
                      onClick={() => setSelectedFont(font)}
                      style={{
                        padding: '8px 14px', borderRadius: 8,
                        background: selectedFont.id === font.id 
                          ? colors.accentLight 
                          : colors.bgTertiary,
                        border: selectedFont.id === font.id 
                          ? `1px solid ${colors.accent}` 
                          : `1px solid ${colors.border}`,
                        color: selectedFont.id === font.id 
                          ? colors.accent 
                          : colors.textSecondary,
                        fontFamily: font.fontFamily,
                        fontSize: 13, cursor: 'pointer',
                        transition: 'all 0.2s ease',
                      }}
                    >
                      {font.name}
                    </button>
                  ))}
                </div>
              </div>

              {/* Color Selection */}
              <div style={{ marginBottom: 24 }}>
                <label style={{ 
                  display: 'block', fontSize: 14, fontWeight: 600, 
                  color: colors.textPrimary, marginBottom: 12 
                }}>
                  🎨 สีตัวอักษร
                </label>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {textColors.map((color) => (
                    <button
                      key={color.id}
                      onClick={() => setSelectedColor(color)}
                      style={{
                        width: 40, height: 40, borderRadius: '50%',
                        background: color.color,
                        border: selectedColor.id === color.id 
                          ? `3px solid ${colors.accent}` 
                          : `2px solid ${colors.border}`,
                        cursor: 'pointer',
                        boxShadow: color.id === 'white' ? 'inset 0 0 0 1px #ddd' : 'none',
                        transition: 'all 0.2s ease',
                      }}
                      title={color.name}
                    />
                  ))}
                </div>
              </div>

              {/* Font Size */}
              <div style={{ marginBottom: 24 }}>
                <label style={{ 
                  display: 'block', fontSize: 14, fontWeight: 600, 
                  color: colors.textPrimary, marginBottom: 12 
                }}>
                  📏 ขนาดตัวอักษร: {fontSize}px
                </label>
                <input
                  type="range"
                  min="16"
                  max="64"
                  value={fontSize}
                  onChange={(e) => setFontSize(Number(e.target.value))}
                  style={{ width: '100%' }}
                />
              </div>

              {/* Action Buttons */}
              <div style={{ display: 'flex', gap: 12 }}>
                <button
                  onClick={generateWithAI}
                  disabled={isGenerating || !stickerText.trim()}
                  style={{
                    flex: 1, padding: '14px 20px', borderRadius: 10,
                    background: isGenerating ? colors.bgTertiary : colors.gradient,
                    border: 'none', color: '#fff',
                    fontSize: 15, fontWeight: 600, cursor: isGenerating ? 'wait' : 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                    boxShadow: isGenerating ? 'none' : '0 4px 16px rgba(6, 199, 85, 0.3)',
                    transition: 'all 0.2s ease',
                    opacity: !stickerText.trim() ? 0.5 : 1,
                  }}
                >
                  {isGenerating ? (
                    <>
                      <Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} />
                      กำลังสร้าง...
                    </>
                  ) : (
                    <>
                      <Sparkles size={18} />
                      สร้าง Sticker
                    </>
                  )}
                </button>
                <button
                  onClick={downloadSticker}
                  style={{
                    padding: '14px 20px', borderRadius: 10,
                    background: colors.bgTertiary,
                    border: `1px solid ${colors.border}`,
                    color: colors.textPrimary,
                    fontSize: 15, fontWeight: 600, cursor: 'pointer',
                    display: 'flex', alignItems: 'center', gap: 8,
                    transition: 'all 0.2s ease',
                  }}
                >
                  <Download size={18} />
                  ดาวน์โหลด
                </button>
              </div>
            </>
          )}

          {activeTab === 'templates' && (
            <div>
              <p style={{ fontSize: 14, color: colors.textSecondary, marginBottom: 16 }}>
                เลือกข้อความสำเร็จรูปเพื่อใช้สร้าง Sticker
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {textTemplates.map((template, idx) => (
                  <button
                    key={idx}
                    onClick={() => {
                      setStickerText(template.text);
                      setActiveTab('create');
                    }}
                    style={{
                      padding: '12px 16px', borderRadius: 10,
                      background: colors.bgSecondary,
                      border: `1px solid ${colors.border}`,
                      color: colors.textPrimary,
                      fontSize: 14, textAlign: 'left', cursor: 'pointer',
                      display: 'flex', alignItems: 'center', gap: 12,
                      transition: 'all 0.2s ease',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = colors.accentLight;
                      e.currentTarget.style.borderColor = colors.accent;
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = colors.bgSecondary;
                      e.currentTarget.style.borderColor = colors.border;
                    }}
                  >
                    <span style={{ fontSize: 24 }}>{template.emoji}</span>
                    <span>{template.text}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'saved' && (
            <div>
              {generatedStickers.length === 0 ? (
                <div style={{ 
                  padding: 40, textAlign: 'center', 
                  color: colors.textMuted 
                }}>
                  <Sparkles size={48} style={{ marginBottom: 16, opacity: 0.5 }} />
                  <p>ยังไม่มี Sticker ที่บันทึกไว้</p>
                  <button
                    onClick={() => setActiveTab('create')}
                    style={{
                      marginTop: 16, padding: '10px 20px', borderRadius: 8,
                      background: colors.accent, border: 'none',
                      color: '#fff', fontSize: 14, cursor: 'pointer',
                    }}
                  >
                    สร้าง Sticker ใหม่
                  </button>
                </div>
              ) : (
                <div style={{ 
                  display: 'grid', 
                  gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))',
                  gap: 12 
                }}>
                  {generatedStickers.map((sticker) => (
                    <div
                      key={sticker.id}
                      style={{
                        aspectRatio: '1', borderRadius: 12,
                        background: colors.bgSecondary,
                        border: `1px solid ${colors.border}`,
                        overflow: 'hidden',
                        position: 'relative',
                      }}
                    >
                      <img 
                        src={sticker.imageUrl} 
                        alt={sticker.text}
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      />
                      <button
                        onClick={() => setGeneratedStickers(prev => prev.filter(s => s.id !== sticker.id))}
                        style={{
                          position: 'absolute', top: 4, right: 4,
                          width: 24, height: 24, borderRadius: '50%',
                          background: 'rgba(0,0,0,0.5)', border: 'none',
                          color: '#fff', cursor: 'pointer',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                        }}
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right Panel - Preview */}
        <div style={{ 
          flex: '1 1 300px', 
          maxWidth: 400,
          background: colors.bgCard, 
          borderRadius: 16, 
          padding: 24,
          border: `1px solid ${colors.border}`,
        }}>
          <h3 style={{ 
            fontSize: 16, fontWeight: 600, 
            color: colors.textPrimary, marginBottom: 16 
          }}>
            👀 ตัวอย่าง Sticker
          </h3>
          
          {/* Canvas Preview */}
          <div style={{
            background: 'linear-gradient(135deg, #f5f5f5 0%, #e0e0e0 100%)',
            borderRadius: 12, padding: 20,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            marginBottom: 16,
          }}>
            <canvas
              ref={canvasRef}
              width={300}
              height={300}
              style={{
                maxWidth: '100%',
                borderRadius: 12,
                background: '#fff',
                boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
              }}
            />
          </div>

          {/* Preview Info */}
          <div style={{ 
            padding: 16, borderRadius: 10, 
            background: colors.bgSecondary,
            border: `1px solid ${colors.border}`,
          }}>
            <div style={{ marginBottom: 12 }}>
              <span style={{ fontSize: 12, color: colors.textMuted }}>ตัวละคร:</span>
              <span style={{ fontSize: 14, color: colors.textPrimary, marginLeft: 8 }}>
                {selectedCharacter.preview} {selectedCharacter.name}
              </span>
            </div>
            <div style={{ marginBottom: 12 }}>
              <span style={{ fontSize: 12, color: colors.textMuted }}>ข้อความ:</span>
              <span style={{ 
                fontSize: 14, color: colors.textPrimary, marginLeft: 8,
                fontFamily: selectedFont.fontFamily,
              }}>
                {stickerText || '-'}
              </span>
            </div>
            <div>
              <span style={{ fontSize: 12, color: colors.textMuted }}>Font:</span>
              <span style={{ fontSize: 14, color: colors.textPrimary, marginLeft: 8 }}>
                {selectedFont.name}
              </span>
            </div>
          </div>

          {/* Tips */}
          <div style={{ 
            marginTop: 16, padding: 16, borderRadius: 10,
            background: `${colors.accent}10`,
            border: `1px solid ${colors.accent}30`,
          }}>
            <p style={{ 
              fontSize: 13, color: colors.accent, 
              margin: 0, fontWeight: 600, marginBottom: 8 
            }}>
              💡 เคล็ดลับ
            </p>
            <ul style={{ 
              fontSize: 12, color: colors.textSecondary, 
              margin: 0, paddingLeft: 16, lineHeight: 1.6,
            }}>
              <li>ใช้ข้อความสั้นๆ จะสวยกว่า</li>
              <li>เลือก Font ที่อ่านง่าย</li>
              <li>ใช้สีที่ตัดกับพื้นหลัง</li>
              <li>ดาวน์โหลดเป็น PNG เพื่อใช้งาน</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Spin Animation */}
      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
