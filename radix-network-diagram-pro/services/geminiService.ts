
import { GoogleGenAI } from "@google/genai";
import { DiagramType } from "../types";

const MODEL_NAME = 'gemini-2.0-flash-exp';

/**
 * 画像のリサイズ処理
 */
const prepareImage = (base64Str: string): Promise<{ data: string, mimeType: string }> => {
  return new Promise((resolve) => {
    const img = new Image();
    img.src = base64Str;
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const LIMIT = 1536; 
      let w = img.width;
      let h = img.height;
      if (w > LIMIT || h > LIMIT) {
        if (w > h) { h = (h * LIMIT) / w; w = LIMIT; }
        else { w = (w * LIMIT) / h; h = LIMIT; }
      }
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d');
      ctx?.drawImage(img, 0, 0, w, h);
      const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
      resolve({ data: dataUrl.split(',')[1], mimeType: 'image/jpeg' });
    };
    img.onerror = () => resolve({ data: base64Str.split(',')[1], mimeType: 'image/png' });
  });
};

export const generateNetworkDiagram = async (
  originalBase64: string,
  type: DiagramType,
  variant: number
): Promise<string> => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("APIキーが設定されていません。");

  const ai = new GoogleGenAI({ apiKey });
  const { data, mimeType } = await prepareImage(originalBase64);

  let styleInstructions = "";
  if (type === DiagramType.TWO_D_PICTO) {
    styleInstructions = `
      - STYLE: Modern professional 2D technical diagram.
      - CAMERA: Strictly 2D flat view.
      - ICONS: Use ONLY white-filled (hollow) outline icons with clean black strokes.
      - LAYOUT: Clean 2D flat topology.
      - CRITICAL: DO NOT include any titles, text headers, or decorative frames. Pure diagram only.
    `;
  } else if (type === DiagramType.THREE_D_FLAT) {
    styleInstructions = `
      - STYLE: 3D Flat View.
      - CAMERA: Strictly TOP-DOWN (Orthographic style). No tilted perspective.
      - ICONS: Use 3D hardware models viewed from directly above.
      - AESTHETICS: Clean, professional IT icons.
      - CRITICAL: NO SHADOWS. Strictly disable all drop shadows.
    `;
  } else if (type === DiagramType.THREE_D_PERSPECTIVE) {
    styleInstructions = `
      - STYLE: 3D Perspective Bird's-eye view.
      - CAMERA: Fixed Perspective looking from the top-left towards the bottom-right.
      - CONNECTIONS: All devices MUST be connected using visible, professional Ethernet/LAN cables.
      - CRITICAL: NO SHADOWS. Render on a pure white floor.
    `;
  }

  const prompt = `
    TASK: Professional network diagram reconstruction (Variant ${variant}).
    Analyze the uploaded sketch and create a clean, digital version based on the instructions below.
    
    STYLE CATEGORY: ${type}
    ${styleInstructions}

    RULES:
    1. TOPOLOGY: Map all nodes and connections from the sketch accurately.
    2. LABELS: Keep English labels, IP addresses, and Models. Translate Japanese labels to English.
    3. BACKGROUND: Pure white.
  `;

  const response = await ai.models.generateContent({
    model: MODEL_NAME,
    contents: {
      parts: [
        { inlineData: { data, mimeType } },
        { text: prompt }
      ]
    },
    config: { imageConfig: { aspectRatio: "4:3", imageSize: "1K" } }
  });

  const part = response.candidates[0].content.parts.find(p => p.inlineData);
  if (!part) throw new Error("画像の生成に失敗しました。");
  return `data:image/png;base64,${part.inlineData.data}`;
};

/**
 * 元のスケッチと現在の画像、両方を参照して修正を加える
 */
export const editNetworkDiagram = async (
  originalSketchBase64: string,
  currentImageBase64: string,
  editInstructions: string,
  type: DiagramType
): Promise<string> => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("APIキーが設定されていません。");

  const ai = new GoogleGenAI({ apiKey });
  
  // 2つの画像を準備
  const sketch = await prepareImage(originalSketchBase64);
  const current = await prepareImage(currentImageBase64);

  const prompt = `
    TASK: Modify the network diagram based on the user request.
    
    CONTEXT:
    - Image 1 (First image): The user's original handwritten sketch (Source of truth for topology).
    - Image 2 (Second image): The current AI-generated diagram.
    
    REQUESTED CHANGE: "${editInstructions}"
    
    INSTRUCTIONS:
    1. Take the current diagram (Image 2) and apply the modification described above.
    2. Ensure the base topology still matches the original sketch (Image 1).
    3. MAINTAIN the style of Image 2 (${type}). Do not change the camera angle, icon style, or color scheme unless requested.
    4. Make the modification obvious and accurate.
    5. Output the result as a single, high-quality image on a pure white background.
  `;

  const response = await ai.models.generateContent({
    model: MODEL_NAME,
    contents: {
      parts: [
        { inlineData: { data: sketch.data, mimeType: sketch.mimeType } },
        { inlineData: { data: current.data, mimeType: current.mimeType } },
        { text: prompt }
      ]
    },
    config: { imageConfig: { aspectRatio: "4:3", imageSize: "1K" } }
  });

  const part = response.candidates[0].content.parts.find(p => p.inlineData);
  if (!part) throw new Error("修正画像の生成に失敗しました。");
  return `data:image/png;base64,${part.inlineData.data}`;
};
