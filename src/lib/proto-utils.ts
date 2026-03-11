// Utility functions for working with protobuf types

import { GameHistory, GameEvent, PlayerInfo } from '../gen/api/proto/vendored/macondo/macondo_pb';

/**
 * Convert snake_case JSON to camelCase proto format
 * This handles the case where we load JSON exported from macondo
 * which uses snake_case field names
 */
export function convertSnakeCaseGameHistory(data: any): GameHistory {
  return {
    events: (data.events || []).map((e: any) => convertSnakeCaseGameEvent(e)),
    players: (data.players || []).map((p: any) => convertSnakeCasePlayerInfo(p)),
    version: data.version || 0,
    originalGcg: data.original_gcg || '',
    lexicon: data.lexicon || '',
    idAuth: data.id_auth || '',
    uid: data.uid || '',
    title: data.title || '',
    description: data.description || '',
    lastKnownRacks: data.last_known_racks || [],
    secondWentFirst: data.second_went_first || false,
    challengeRule: data.challenge_rule || 0,
    playState: data.play_state || 0,
    finalScores: data.final_scores || [],
    variant: data.variant || 'classic',
    winner: data.winner || 0,
    boardLayout: data.board_layout || 'CrosswordGame',
    letterDistribution: data.letter_distribution || 'english',
    startingCgp: data.starting_cgp || '',
  } as GameHistory;
}

function convertSnakeCaseGameEvent(e: any): GameEvent {
  return {
    nickname: e.nickname || '',
    note: e.note || '',
    rack: e.rack || '',
    type: convertEventType(e.type),
    cumulative: e.cumulative || 0,
    row: e.row || 0,
    column: e.column || 0,
    direction: convertDirection(e.direction),
    position: e.position || '',
    playedTiles: e.played_tiles || '',
    exchanged: e.exchanged || '',
    score: e.score || 0,
    bonus: e.bonus || 0,
    endRackPoints: e.end_rack_points || 0,
    lostScore: e.lost_score || 0,
    isBingo: e.is_bingo || false,
    wordsFormed: e.words_formed || [],
    millisRemaining: e.millis_remaining || 0,
    playerIndex: e.player_index !== undefined ? e.player_index : 0,
    numTilesFromRack: e.num_tiles_from_rack || 0,
  } as GameEvent;
}

function convertSnakeCasePlayerInfo(p: any): PlayerInfo {
  return {
    nickname: p.nickname || '',
    realName: p.real_name || '',
    userId: p.user_id || '',
  } as PlayerInfo;
}

function convertEventType(type: any): number {
  // Handle both string and numeric types
  if (typeof type === 'string') {
    const typeMap: Record<string, number> = {
      'TILE_PLACEMENT_MOVE': 0,
      'PHONY_TILES_RETURNED': 1,
      'PASS': 2,
      'CHALLENGE_BONUS': 3,
      'EXCHANGE': 4,
      'END_RACK_PTS': 5,
      'TIME_PENALTY': 6,
      'END_RACK_PENALTY': 7,
      'UNSUCCESSFUL_CHALLENGE_TURN_LOSS': 8,
      'CHALLENGE': 9,
    };
    return typeMap[type] || 0;
  }
  return type || 0;
}

function convertDirection(direction: any): number {
  // Handle both string and numeric directions
  if (typeof direction === 'string') {
    return direction === 'HORIZONTAL' ? 0 : 1;
  }
  return direction || 0;
}
