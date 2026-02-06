
import { GoogleGenAI, Type } from "@google/genai";
import { StoryboardConfig, AnalysisResult, AspectRatio, SceneDetail, ChatMessage } from "../types";

export const analyzeScript = async (config: StoryboardConfig): Promise<AnalysisResult> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  const charCount = config.script.length;
  const estimatedMinutes = Math.max(0.5, charCount / 400); 

  let targetCount = config.targetSceneCount || 0;
  if (targetCount === 0) {
    switch (config.sceneDetail) {
      case SceneDetail.ESSENTIAL: 
        targetCount = Math.max(2, Math.ceil(estimatedMinutes * 2)); 
        break;
      case SceneDetail.DETAILED: 
        targetCount = Math.ceil(estimatedMinutes * 12); 
        break;
      default: 
        targetCount = Math.max(2, Math.ceil((charCount / 1000) * 4)); 
        break;
    }
  }
  const finalTargetCount = Math.min(50, Math.max(1, Math.round(targetCount)));

  const newsModeInstruction = config.isNonHumanoid ? `
    # STYLE MODE: NEWS & ECONOMY (시사 정보 모드)
    - FOCUS: Professional presentation, charts, realistic office/studio settings.
  ` : "";

  let focusInstructions = "";
  if (config.focusMode === 'auto') {
    focusInstructions = `
      # PRODUCTION FOCUS: AUTO (자동 판단)
      - MISSION: Dynamically determine the best visual focus for each scene.
    `;
  } else if (config.focusMode === 'script') {
    focusInstructions = `
      # PRODUCTION FOCUS: SCRIPT & INFO CENTERED (대본/정보 중심)
    `;
  } else {
    focusInstructions = `
      # PRODUCTION FOCUS: CHARACTER NARRATIVE (인물 중심)
    `;
  }

  const customPromptPart = config.customInstructions ? `
    # CRITICAL USER DIRECTING PARAMETERS:
    ${config.customInstructions}
    - Ensure these specific instructions are reflected in every scene description and visual prompt.
  ` : "";

  const textPrompt = `
    # ROLE: Visual Director & Style Analyst
    # TASK: Analyze the script and PROVIDED REFERENCE IMAGES to create a storyboard.
    
    # STYLE ANALYSIS (HIGHEST PRIORITY):
    - If a "Style Reference" image is provided, IGNORE the preset name (${config.style}) and extract the EXACT artistic medium, brush strokes, line weight, color palette, and lighting from the image.
    - Write a detailed "globalStyleGuide" based on these observations.
    
    # CHARACTER IDENTITY ANALYSIS:
    - If a "Character Reference" image is provided, describe the face shape, eye color/shape, hair texture/length/color, and any unique facial markers in "characterDescription".
    - MISSION: Use this profile for consistency while allowing the character to perform new actions.
    
    # SCENE DIRECTING:
    - Screen Ratio: ${config.aspectRatio}
    ${newsModeInstruction}
    ${focusInstructions}
    ${customPromptPart}
    
    # CONSTRAINTS:
    - Split into exactly ${finalTargetCount} scenes.
    - Group related sentences. No excessive cutting.
    - Each "videoPromptEn" must be a full cinematic description.

    # SCRIPT:
    ${config.script}

    # OUTPUT SCHEMA (JSON):
    {
      "scenes": [
        {
          "scriptSegment": "Script lines",
          "videoPromptEn": "Detailed cinematic prompt in English",
          "videoPromptKo": "한글 연출 설명"
        }
      ],
      "characterDescription": "Face and hair identity profile extracted from the reference image",
      "globalStyleGuide": "Detailed artistic medium and texture guide extracted from reference images"
    }
  `;

  const parts: any[] = [{ text: textPrompt }];
  if (config.styleImage) parts.push({ inlineData: { mimeType: "image/jpeg", data: config.styleImage.split(',')[1] } });
  if (config.characterImage) parts.push({ inlineData: { mimeType: "image/jpeg", data: config.characterImage.split(',')[1] } });

  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: { parts },
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          scenes: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                scriptSegment: { type: Type.STRING },
                videoPromptEn: { type: Type.STRING },
                videoPromptKo: { type: Type.STRING }
              },
              required: ["scriptSegment", "videoPromptEn", "videoPromptKo"]
            }
          },
          characterDescription: { type: Type.STRING },
          globalStyleGuide: { type: Type.STRING }
        },
        required: ["scenes", "characterDescription", "globalStyleGuide"]
      }
    }
  });

  const parsed = JSON.parse(response.text.trim());
  return {
    ...parsed,
    scenes: parsed.scenes.slice(0, finalTargetCount)
  };
};

export const generateSceneImage = async (
  prompt: string, 
  styleGuide: string, 
  charDesc: string, 
  aspectRatio: AspectRatio,
  styleImage?: string,
  characterImage?: string
): Promise<string> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  const instruction = `
    MASTER STORYBOARD FRAME GENERATION:
    - TARGET SCENE: ${prompt}
    - ARTISTIC STYLE: ${styleGuide}
    - CHARACTER IDENTITY PROFILE: ${charDesc}

    # STRICT DIRECTIVE - DYNAMIC CHARACTER RENDERING:
    1. **IDENTITY ONLY**: If a character image is provided, you MUST only extract the "Identity" (Face shape, eye details, hair). 
    2. **NEW POSE & EXPRESSION**: You are strictly FORBIDDEN from copying the pose or facial expression from the character reference image. The character MUST perform the action described in "TARGET SCENE".
    3. **NEW CLOTHING**: Unless the script specifically mentions the reference clothing, you MUST generate new attire suitable for the current scene and context.
    4. **NEW BACKGROUND**: Do not use the background from the reference image.
    5. **STYLE HARMONY**: The entire frame (including the character) must be rendered in the exact artistic medium described in "ARTISTIC STYLE".
    6. Ensure professional cinematic lighting and high-end visual production quality.
  `;
  
  const parts: any[] = [{ text: instruction }];
  if (styleImage) parts.push({ inlineData: { mimeType: "image/jpeg", data: styleImage.split(',')[1] } });
  if (characterImage) parts.push({ inlineData: { mimeType: "image/jpeg", data: characterImage.split(',')[1] } });

  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash-image',
    contents: { parts },
    config: { imageConfig: { aspectRatio: aspectRatio as any } }
  });

  for (const part of response.candidates[0].content.parts) {
    if (part.inlineData) return `data:image/png;base64,${part.inlineData.data}`;
  }
  throw new Error("Generation Failed");
};

export const sendChatMessage = async (messages: ChatMessage[]): Promise<string> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const lastMessage = messages[messages.length - 1].content;
  const history = messages.slice(0, -1).map(m => ({
    role: m.role,
    parts: [{ text: m.content }]
  }));

  const chat = ai.chats.create({
    model: 'gemini-3-pro-preview',
    config: {
      systemInstruction: 'You are an elite Video Production AI Assistant and Code Helper. You specialize in script optimization, cinematic shot composition, lighting theory, and technical software advice for the AI Storyboard Pro application. Be concise, professional, and helpful.',
      history: history
    }
  });

  const response = await chat.sendMessage({ message: lastMessage });
  return response.text || "죄송합니다. 응답을 생성하지 못했습니다.";
};
