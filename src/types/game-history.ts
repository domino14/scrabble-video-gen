// Type definitions ported from macondo GameHistory protobuf

export enum GameEventType {
  TILE_PLACEMENT_MOVE = 0,
  PHONY_TILES_RETURNED = 1,
  PASS = 2,
  CHALLENGE_BONUS = 3,
  EXCHANGE = 4,
  END_RACK_PTS = 5,
  TIME_PENALTY = 6,
  CHALLENGE = 7,
  UNSUCCESSFUL_CHALLENGE_TURN_LOSS = 8,
}

export interface GameEvent {
  nickname: string;
  note: string;
  rack: string;
  type: GameEventType | string; // Can be enum value or string like "TILE_PLACEMENT_MOVE"
  cumulative: number;
  row: number;
  column: number;
  direction?: string; // "HORIZONTAL" or "VERTICAL"
  position: string;
  played_tiles: string;
  exchanged: string;
  score: number;
  bonus: number;
  end_rack_points: number;
  time_penalty?: number;
  lost_score: number;
  millis_remaining: number;
  is_bingo?: boolean;
  words_formed?: string[];
  player_index?: number;
  num_tiles_from_rack?: number;
}

export interface PlayerInfo {
  nickname: string;
  real_name: string;
  user_id: string;
}

export interface GameHistory {
  players: PlayerInfo[];
  events: GameEvent[];
  version: number;
  lexicon: string;
  id_auth: string;
  uid: string;
  title: string;
  description: string;
  last_update: number;
  challenge_rule: number;
  variant: string;
  initial_time_seconds: number;
  increment_seconds: number;
  max_overtime_minutes: number;
  rating_mode: string;
  game_end_reason: number;
  winner: number;
  final_scores?: number[];
  board_layout: string;
  letter_distribution: string;
}
