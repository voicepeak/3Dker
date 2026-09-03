const DEFAULT_BASE = "https://api.deepseek.com";
const DEFAULT_MODEL = "deepseek-chat";

export interface LlmSettings {
  apiKey: string;
  baseUrl: string;
  model: string;
}

export function defaultLlmSettings(): LlmSettings {
  const inBrowser = typeof window !== "undefined";
  return {
    apiKey: "",
    baseUrl: inBrowser ? "/deepseek" : DEFAULT_BASE,
    model: DEFAULT_MODEL,
  };
}

function extractJson(text: string): unknown {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  const raw = (fenced?.[1] ?? text).trim();
    const start = raw.search(/[\[{]/);
  if (start < 0) throw new Error("模型没有返回 JSON");
  try {
    return JSON.parse(raw.slice(start));
  } catch {
    const endObj = raw.lastIndexOf("}");
    const endArr = raw.lastIndexOf("]");
    const end = Math.max(endObj, endArr);
    if (end > start) return JSON.parse(raw.slice(start, end + 1));
    throw new Error("模型返回的 JSON 无法解析");
  }
}

export async function completeJson(settings: LlmSettings, system: string, user: string): Promise<unknown> {
  if (!settings.apiKey.trim()) throw new Error("还没有填写 DeepSeek API Key");
  const response = await fetch(`${settings.baseUrl.replace(/\/$/, "")}/v1/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${settings.apiKey.trim()}`,
    },
    body: JSON.stringify({
      model: settings.model || DEFAULT_MODEL,
      temperature: 0.2,
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
    }),
  });
  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`DeepSeek 请求失败 ${response.status}: ${detail.slice(0, 240)}`);
  }
  const data = (await response.json()) as { choices?: Array<{ message?: { content?: string } }> };
  const content = data.choices?.[0]?.message?.content;
  if (!content) throw new Error("DeepSeek 返回为空");
  return extractJson(content);
}

export const SCENE_SYSTEM = `你是语义三维导演台的场景调度助手。只输出 JSON，不要解释，不要输出摄像机坐标。
JSON 形状：
{"ops":[
  {"kind":"clear"},
  {"kind":"upsert","type":"person|box|table|vase|wall|door","name":"可选","at":"origin","relative":{"ofType":"person","ofName":"人物","side":"front|back|left|right|back_left|back_right","distance":0.9}},
  {"kind":"path","ofType":"person","side":"front","distance":4,"duration":6}
]}
规则：
- 只能使用上述物体类型和 side。
- 用相对位置，不要写 x/y/z。
- 原点人物用 at:"origin"。
- 若用户描述的是完整新场景，第一个 op 用 {"kind":"clear"}。
- 不要生成 camera.position / rotation。`;

export const CAMERA_SYSTEM = `你是语义三维导演台的摄像机意图助手。只输出 JSON，不要解释，不要输出世界坐标。
JSON 形状：
{"motion":{"type":"static|orbit|dolly|truck|crane|follow", "...":"按类型补字段"},
 "target":{"entityId":"可选","entityName":"人物","entityType":"person","anchor":"chest"},
 "height":{"entityType":"vase","anchor":"top"} 或 null,
 "lens":{"focalLength":35},
 "framing":{"type":"extreme_wide|wide|full|medium|medium_close|close"},
 "duration":6}
motion 字段：
- orbit: angle, direction=clockwise|counter_clockwise, startAzimuth, startSide=front|back|left|right
- dolly: direction=in|out, startSide, distance?
- truck: direction=left|right, distance, startSide
- crane: direction=up|down, distance, startSide
- follow: offset:{side:front|back|left|right|back_left|back_right,distance?}
- static: startSide
规则：
- target 必须指向用户提供的场景清单里已有物体。
- 禁止 camera.position / rotation / xyz。
- 高度用物体锚点，不要写绝对米数，除非用户明确要求。`;
