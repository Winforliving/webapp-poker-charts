// Póker kártyák értékei
export type Rank = 'A' | 'K' | 'Q' | 'J' | 'T' | '9' | '8' | '7' | '6' | '5' | '4' | '3' | '2';

// Kezek típusai
export type HandType = 'pair' | 'suited' | 'offsuit';

// Kézazonosító (pl. "AA", "AKs", "AKo")
export type HandId = string;

// Játékos pozíciók
export enum Position {
  EP = 0, // Early Position
  MP = 1, // Middle Position
  LJ = 2, // Lo Jack
  HJ = 3, // Hi Jack
  CO = 4, // Cut Off
  BU = 5, // Button
  SB = 6, // Small Blind
  BB = 7  // Big Blind
}

// Akció típusok
export type ActionType = 'F' | 'C' | 'R';

// Node típus a HRC adatokhoz
export interface NodeData {
  player: Position;     // Játékos pozíciója
  street: number;       // Utca (0 = preflop, 1 = flop, stb.)
  sequence: number[];   // Akciók sorozata
  actions: {           // Lehetséges akciók
    type: ActionType;   // Akció típusa (F = fold, C = call, R = raise)
    amount: number;     // Akció mennyisége (chip-ben)
    node: number;       // Következő node ID
  }[];
  hands: Record<HandId, {  // Kezek adatai
    weight: number;        // Kéz súlyozása (0-1)
    played: number[];      // Játszási gyakoriság akciónként
    evs: number[];         // Expected value akciónként
  }>;
}

// Importált HRC adatok
export interface ImportedData {
  settings: {
    handdata: {
      stacks: number[];    // Stackek méretei
      blinds: number[];    // Vakok méretei
    }
  };
  nodes: Record<number, NodeData>;  // Összes node a játékhelyzetekhez
}

// Cella értékek a charton való megjelenítéshez
export interface CellValue {
  frequency: number;         // Játszási gyakoriság
  ev: number;                // Expected value
  handData: {               // A kéz részletes adatai
    weight: number;          // Súlyozás
    played: number[];        // Játszási gyakoriság akciónként
    evs: number[];           // EV akciónként
  };
  actions: {                // Lehetséges akciók
    type: ActionType;        // Akció típusa
    amount: number;          // Akció mennyisége
    node: number;            // Következő node ID
  }[];
}

// Navigációs lépés
export interface NavigationStep {
  position: Position;       // Pozíció
  actionType: ActionType;   // Akció típusa
  actionAmount: number;     // Akció mennyisége
  nodeId: number;           // Node ID
  round: number;            // Hányadik kör (ugyanaz a pozíció újra cselekedhet)
}