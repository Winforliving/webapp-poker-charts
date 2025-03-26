import { create } from 'zustand';
import { ImportedData, NodeData, Position, ActionType, NavigationStep, CellValue, HandId } from '@/types/poker';

interface RangeState {
  // Importált adatok
  importedData: ImportedData | null;
  
  // Jelenlegi állapot
  currentNodeId: number | null;
  currentNode: NodeData | null;
  currentBB: number; // Big Blind mérete
  navigationHistory: NavigationStep[];
  
  // Cellák értéke a megjelenítéshez
  cellValues: Record<HandId, CellValue>;
  
  // Lehetséges stack méretek
  availableStacks: number[];
  currentStackBB: number | null;
  
  // Betöltött-e már adatot
  isDataLoaded: boolean;
  
  // Akciók
  setImportedData: (data: ImportedData) => void;
  selectStack: (stack: number) => void;
  loadInitialNode: (position: Position) => void;
  selectAction: (actionType: ActionType, amount: number, nodeId: number) => void;
  navigateBack: (stepIndex: number) => void;
  resetState: () => void;
}

// Alap póker kezek generálása a 13x13 charthoz
const generateAllHands = (): HandId[] => {
  const ranks = ['A', 'K', 'Q', 'J', 'T', '9', '8', '7', '6', '5', '4', '3', '2'];
  const hands: HandId[] = [];
  
  for (let i = 0; i < ranks.length; i++) {
    for (let j = 0; j < ranks.length; j++) {
      if (i === j) {
        // Párok (AA, KK, stb.)
        hands.push(`${ranks[i]}${ranks[i]}`);
      } else if (i < j) {
        // Suited kezek (AKs, QJs, stb.)
        hands.push(`${ranks[i]}${ranks[j]}s`);
      } else {
        // Offsuit kezek (AKo, QJo, stb.)
        hands.push(`${ranks[j]}${ranks[i]}o`);
      }
    }
  }
  
  return hands;
};

// Empty cell values létrehozása minden lehetséges kézre
const createEmptyCellValues = (): Record<HandId, CellValue> => {
  const hands = generateAllHands();
  const cellValues: Record<HandId, CellValue> = {};
  
  hands.forEach(hand => {
    cellValues[hand] = {
      frequency: 0,
      ev: 0,
      handData: { weight: 0, played: [], evs: [] },
      actions: []
    };
  });
  
  return cellValues;
};

// Store létrehozása
export const useRangeStore = create<RangeState>((set, get) => ({
  importedData: null,
  currentNodeId: null,
  currentNode: null,
  currentBB: 0,
  navigationHistory: [],
  cellValues: createEmptyCellValues(),
  availableStacks: [],
  currentStackBB: null,
  isDataLoaded: false,
  
  // Importált adatok beállítása
  setImportedData: (data: ImportedData) => {
    // Big Blind érték kiszámítása
    const bb = data.settings.handdata.blinds[0];
    
    // Elérhető stack-ek kiszámítása BB-ben és egyedi értékek kiválasztása
    const availableStacks = data.settings.handdata.stacks 
      ? [...new Set(data.settings.handdata.stacks.map(stack => Math.floor(stack / bb)))]
      : [];
    
    set({
      importedData: data,
      currentBB: bb,
      availableStacks,
      isDataLoaded: true,
      cellValues: createEmptyCellValues() // Alaphelyzetbe állítjuk a cellákat
    });
  },
  
  // Stack méret kiválasztása
  selectStack: (stack: number) => {
    set({
      currentStackBB: stack,
      navigationHistory: [], // Újra kezdjük a navigációt
      currentNodeId: null,
      currentNode: null,
      cellValues: createEmptyCellValues()
    });
  },
  
  // Kezdeti node betöltése (választott pozícióhoz)
  loadInitialNode: (position: Position) => {
    const { importedData } = get();
    if (!importedData) return;
    
    // Keressük a megfelelő kezdő node-ot
    // Ez általában az üres sequence-szel rendelkező, és a megfelelő player értékkel
    const initialNodeId = Object.entries(importedData.nodes).find(([_, node]) => 
      node.player === position && node.sequence.length === 0 && node.street === 0
    )?.[0];
    
    if (initialNodeId) {
      const nodeId = parseInt(initialNodeId);
      const node = importedData.nodes[nodeId];
      
      // Cellaértékek frissítése
      const newCellValues = createEmptyCellValues();
      
      // Minden kézre frissítjük az értékeket a node alapján
      Object.entries(node.hands).forEach(([handId, handData]) => {
        // A legnagyobb frekvencia kiválasztása a "played" tömbből
        const maxFreqIndex = handData.played.indexOf(Math.max(...handData.played));
        const maxFreq = handData.played[maxFreqIndex];
        const maxEv = handData.evs[maxFreqIndex];
        
        if (handId in newCellValues) {
          newCellValues[handId as HandId] = {
            frequency: maxFreq,
            ev: maxEv,
            handData,
            actions: node.actions
          };
        }
      });
      
      // Állapot frissítése
      set({
        currentNodeId: nodeId,
        currentNode: node,
        cellValues: newCellValues,
        navigationHistory: [{
          position,
          actionType: ActionType.F, // Kezdetben nincs akció
          actionAmount: 0,
          nodeId,
          round: 1
        }]
      });
    }
  },
  
  // Akció kiválasztása
  selectAction: (actionType: ActionType, amount: number, nodeId: number) => {
    const { importedData, navigationHistory } = get();
    if (!importedData || !importedData.nodes[nodeId]) return;
    
    const nextNode = importedData.nodes[nodeId];
    
    // Új navigációs lépés hozzáadása
    const newStep: NavigationStep = {
      position: nextNode.player,
      actionType,
      actionAmount: amount,
      nodeId,
      round: 1 // Alapértelmezetten 1. kör
    };
    
    // Ellenőrizzük, hogy ez a pozíció már szerepelt-e a navigációban
    // Ha igen, növeljük a round értéket
    const positionCount = navigationHistory.filter(step => step.position === nextNode.player).length;
    if (positionCount > 0) {
      newStep.round = positionCount + 1;
    }
    
    // Cellaértékek frissítése az új node alapján
    const newCellValues = createEmptyCellValues();
    
    // Minden kézre frissítjük az értékeket
    Object.entries(nextNode.hands).forEach(([handId, handData]) => {
      const maxFreqIndex = handData.played.indexOf(Math.max(...handData.played));
      const maxFreq = handData.played[maxFreqIndex];
      const maxEv = handData.evs[maxFreqIndex];
      
      if (handId in newCellValues) {
        newCellValues[handId as HandId] = {
          frequency: maxFreq,
          ev: maxEv,
          handData,
          actions: nextNode.actions
        };
      }
    });
    
    // Állapot frissítése
    set({
      currentNodeId: nodeId,
      currentNode: nextNode,
      cellValues: newCellValues,
      navigationHistory: [...navigationHistory, newStep]
    });
  },
  
  // Visszalépés egy korábbi állapotba
  navigateBack: (stepIndex: number) => {
    const { importedData, navigationHistory } = get();
    if (!importedData || stepIndex < 0 || stepIndex >= navigationHistory.length) return;
    
    // Visszalépünk a kiválasztott lépésig
    const newHistory = navigationHistory.slice(0, stepIndex + 1);
    const currentStep = newHistory[newHistory.length - 1];
    
    // Betöltjük az ahhoz tartozó node-ot
    const node = importedData.nodes[currentStep.nodeId];
    
    // Cellaértékek frissítése
    const newCellValues = createEmptyCellValues();
    
    // Minden kézre frissítjük az értékeket
    Object.entries(node.hands).forEach(([handId, handData]) => {
      const maxFreqIndex = handData.played.indexOf(Math.max(...handData.played));
      const maxFreq = handData.played[maxFreqIndex];
      const maxEv = handData.evs[maxFreqIndex];
      
      if (handId in newCellValues) {
        newCellValues[handId as HandId] = {
          frequency: maxFreq,
          ev: maxEv,
          handData,
          actions: node.actions
        };
      }
    });
    
    // Állapot frissítése
    set({
      currentNodeId: currentStep.nodeId,
      currentNode: node,
      cellValues: newCellValues,
      navigationHistory: newHistory
    });
  },
  
  // Állapot alaphelyzetbe állítása
  resetState: () => {
    set({
      currentNodeId: null,
      currentNode: null,
      navigationHistory: [],
      cellValues: createEmptyCellValues(),
      currentStackBB: null
    });
  }
}));