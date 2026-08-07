// ==============================================================================
// TYPESCRIPT TYPES: GALERIA DE DEFENSORES ONLINE
// ==============================================================================

export interface Profile {
  id: string;
  username: string;
  email?: string;
  avatar_url?: string;
  about: string;
  cep: string;
  country: string;
  state: string;
  city: string;
  created_at: string;
  updated_at: string;
}

export type AttributeRollType = 'ROLL_UNDER' | 'ROLL_OVER' | 'DICE_POOL' | 'ROLL_AND_ADD';

export interface AttributeRollConfig {
  type: AttributeRollType;
  diceCount: number;
  diceFaces: number;
  allowCritical: boolean;
  critSuccessValue?: number;
  critFailureValue?: number;
  defaultTargetNumber?: number;
}

export interface RuleSystem {
  id: string;
  user_id: string;
  name: string;
  description?: string;
  is_active: boolean;
  attributes: Record<string, any>; // ex: { F: { label: "Força" } }
  resources: Record<string, any>;  // ex: { PV: { label: "PV" } }
  advantages?: any[];
  disadvantages?: any[];
  skills?: any[];
  damage_types?: string[];
  attribute_roll_config?: AttributeRollConfig;
  is_base_system?: boolean;
  created_at: string;
}

export interface Table {
  id: string;
  name: string;
  description: string;
  master_id: string;
  rule_system_id?: string;
  rule_systems?: { name: string } | null;
  is_private: boolean;
  password?: string;
  max_players?: number;
  allow_spectators?: boolean;
  rules_mod: Record<string, any>;
  custom_damage_types: string[];
  custom_unique_advantages: UniqueAdvantage[];
  has_separated_chat?: boolean;
  last_visual_roll?: VisualRoll;
  created_at: string;
}

export interface TablePlayer {
  table_id: string;
  player_id: string;
  role: 'player' | 'spectator';
  created_at: string;
  profiles?: {
    username: string;
    avatar_url?: string;
  } | null;
}

export interface ModifierOption {
  id: string;
  name: string;
  costPt: number;
  description: string;
}

export interface AdvantageItem {
  id: string;
  name: string;
  description: string;
  cost: string;
  appliedCostPt?: number;
  // Campos de Vantagem Modular
  isModular?: boolean;
  modifiers?: ModifierOption[];
  selectedModifiers?: string[];
  baseCostPt?: number;
}

export interface Spell {
  id: string;
  name: string;
  school: string;
  requirements: string;
  cost: string;
  range: string;
  duration: string;
  description: string;
}

export interface InventoryItem {
  id: string;
  name: string;
  description: string;
  quantity: number;
  is_equipped?: boolean;
  bonus_attribute?: string; // ex: 'F', 'H', 'R', 'A', 'PdF'
  bonus_value?: number;     // ex: 1, 2, -1
}

export interface UniqueAdvantage {
  id: string;
  name: string;
  description: string;
  cost: number;
}

export interface RollComponent {
  id: string;
  count: number;
  faces: number;
  bonus: number;
  isNegative: boolean;
  canCrit: boolean;
  critRangeStart?: number;
  critMultiplier: number;
}

export interface CustomRoll {
  id: string;
  name: string;
  description: string;
  components: RollComponent[];
  globalModifier: number;
  primaryAttribute: string;
  secondaryAttribute: string;
  accumulateCrit: boolean;
  pmCost?: number;
  type?: 'ATTACK' | 'DEFENSE' | 'MAGIC' | 'TEST' | 'INITIATIVE' | 'OTHER';
}

export interface Character {
  id: string;
  user_id: string;
  rule_system_id?: string;
  table_id?: string;
  name: string;
  scale: number; // 0=Ningen, 1=Sugoi, 2=Kiodai, 3=Kami
  points_total: number;
  points_spent: number;
  concept: string;
  attributes_values: Record<string, number>;
  resources_current: Record<string, number>;
  advantages: AdvantageItem[];
  disadvantages: AdvantageItem[];
  skills: AdvantageItem[];
  specializations: AdvantageItem[];
  spells: Spell[];
  inventory: InventoryItem[];
  unique_advantage?: UniqueAdvantage;
  custom_rolls: CustomRoll[];
  damage_type_forca: string;
  damage_type_pdf: string;
  saved_points: number;
  experience: number;
  status_effects: string[];
  annotations: string;
  is_hidden: boolean;
  image_url: string;
  created_at: string;
  updated_at: string;
}

export type MessageType = 'TEXT' | 'ROLL' | 'SYSTEM' | 'IMAGE';

export interface DieProperty {
  isCritical: boolean;
  value: number;
}

export interface RollResult {
  total: number;
  dices: number[];
  modifiers: number;
  isCrit: boolean;
  componentsText?: string;
}

export interface VisualRoll {
  id: string;
  senderId: string;
  senderName: string;
  diceCount: number;
  diceValues: number[];
  diceProperties: DieProperty[];
  canCrit: boolean;
  isNegative: boolean;
  critRangeStart: number;
  timestamp: number;
}

export interface ChatMessage {
  id: string;
  table_id: string;
  sender_id: string;
  sender_name: string;
  sender_avatar?: string;
  image_url?: string;
  content: string;
  type: MessageType;
  channel?: 'ON' | 'OFF';
  character_id?: string;
  roll_result?: RollResult;
  reply_to_message_id?: string;
  reply_to_sender_name?: string;
  reply_to_content?: string;
  reply_to_type?: MessageType;
  is_edited: boolean;
  created_at: string;
}

export interface Notification {
  id: string;
  user_id: string;
  sender_id?: string;
  title: string;
  message: string;
  type: string;
  table_id?: string;
  is_read: boolean;
  created_at: string;
}
