import type { FramingType, MotionIntent } from "@semantic-director/camera-dsl";
import type { SemanticType } from "@semantic-director/shared";

export const TYPE_LABEL: Record<SemanticType, string> = {
  person: "人物",
  box: "箱子",
  table: "桌子",
  vase: "花瓶",
  wall: "墙",
  door: "门",
};

export const MOTION_LABEL: Record<MotionIntent["type"], string> = {
  static: "固定",
  orbit: "环绕",
  dolly: "推拉",
  truck: "横移",
  crane: "升降",
  follow: "跟随",
};

export const FRAMING_LABEL: Record<FramingType, string> = {
  extreme_wide: "大远景",
  wide: "远景",
  full: "全身",
  medium: "中景",
  medium_close: "中近景",
  close: "近景",
};

export const ANCHOR_LABEL: Record<string, string> = {
  center: "中心",
  top: "顶部",
  bottom: "底部",
  left: "左侧",
  right: "右侧",
  front: "前方",
  back: "后方",
  head: "头部",
  eyes: "眼睛",
  chest: "胸部",
  waist: "腰部",
  feet: "脚底",
  shoulder_left: "左肩",
  shoulder_right: "右肩",
};

export const SIDE_LABEL: Record<string, string> = {
  front: "前方",
  back: "后方",
  left: "左侧",
  right: "右侧",
  back_left: "左后方",
  back_right: "右后方",
};

export function typeLabel(type: string): string {
  return TYPE_LABEL[type as SemanticType] ?? type;
}

export function anchorLabel(name: string): string {
  return ANCHOR_LABEL[name] ?? name;
}
