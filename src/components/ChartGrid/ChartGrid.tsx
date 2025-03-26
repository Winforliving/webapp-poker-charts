'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useRangeStore } from '@/store/rangeStore';
import Tooltip from '../Tooltip/Tooltip';
import type { HandId, ActionType } from '@/types/poker';

/**
 * ChartGrid komponens - egy 13x13-as táblázatban jeleníti meg a póker kezeket
 * A cellák színe a játszási gyakoriságot jelzi, a tooltip pedig részletes infót mutat
 */
const ChartGrid: React.FC = () => {
  const { cellValues, currentBB } = useRangeStore();
  const [tooltipInfo, setTooltipInfo] = useState<{ handId: HandId; x: number; y: number } | null>(null);
  const [raiseAmounts, setRaiseAmounts] = useState<number[]>([]);
  
  // Rangok, amik a táblázat fejlécében és az első oszlopban megjelennek
  const ranks = ['A', 'K', 'Q', 'J', 'T', '9', '8', '7', '6', '5', '4', '3', '2'];

  // Az egész chartból kinyerjük a lehetséges raise értékeket
  useEffect(() => {
    // Minden cellából kigyűjtjük a raise értékeket
    const allRaiseAmounts = new Set<number>();
    
    Object.values(cellValues).forEach(cellValue => {
      if (cellValue.actions) {
        cellValue.actions.forEach(action => {
          if (action.type === 'R') {
            allRaiseAmounts.add(action.amount);
          }
        });
      }
    });
    
    // Csökkenő sorrendbe rendezzük a raise értékeket
    const sortedRaiseAmounts = Array.from(allRaiseAmounts).sort((a, b) => b - a);
    setRaiseAmounts(sortedRaiseAmounts);
  }, [cellValues]);
  
  /**
   * Kiszámítja a cella háttérszínét az akció típusa és EV alapján
   * @param actionType Akció típusa (R/C/F)
   * @param amount Akció mennyisége (BB-ben)
   * @param ev Expected Value
   * @returns CSS színkód
   */
  const getActionColor = (actionType: ActionType, amount: number, ev: number): string => {
    if (actionType === 'F') return '#f5f5f5'; // Fold - szürke
    
    // Raise akciók - kékek különböző árnyalatai, a legnagyobbtól a legkisebbig
    if (actionType === 'R') {
      const index = raiseAmounts.indexOf(amount);
      
      switch (index) {
        case 0: return '#0d47a1'; // Legsötétebb kék - legnagyobb raise
        case 1: return '#1565c0'; // Nagyon sötét kék - második legnagyobb raise
        case 2: return '#1976d2'; // Sötétkék - harmadik legnagyobb raise
        case 3: return '#2196f3'; // Középkék - negyedik legnagyobb raise
        case 4: return '#42a5f5'; // Világoskék - ötödik legnagyobb raise
        case 5: return '#64b5f6'; // Halványkék - hatodik legnagyobb raise
        default: return '#bbdefb'; // Leghalványabb kék - további kisebb raise-ek
      }
    }
    
    // Call akciók - zöldes árnyalatok
    if (actionType === 'C') {
      return '#4caf50'; // Call - zöld
    }
    
    // Check akciók - sárgás árnyalatok
    return '#ffeb3b'; // Check - sárga
  };
  
  /**
   * Akciók rendezése prioritás szerint: nagyobb raise-től a kisebb felé, majd call/check/fold
   * @param actions Az akciók listája
   * @returns Rendezett akciók listája
   */
  const sortActionsByPriority = (handData: any) => {
    if (!handData || !handData.played || !handData.actions) return [];
    
    const { played, actions } = handData;
    
    // Akciók az előfordulási gyakoriságokkal
    const actionsWithFreq = actions.map((action: any, index: number) => ({
      type: action.type,
      amount: action.amount,
      frequency: played[index] || 0,
      ev: handData.evs && handData.evs[index] ? handData.evs[index] : 0
    }));
    
    // Szűrjük a 0 frekvenciájú akciókat
    const filteredActions = actionsWithFreq.filter((action: { frequency: number }) => action.frequency > 0);
    
    // Rendezzük a prioritás szerint
    return filteredActions.sort((a: { type: string; amount: number }, b: { type: string; amount: number }) => {
      // Először a raise-ek, nagyobbtól a kisebbig
      if (a.type === 'R' && b.type === 'R') {
        return b.amount - a.amount;
      }
      
      // Raise előnyt élvez a többiek felett
      if (a.type === 'R' && b.type !== 'R') return -1;
      if (a.type !== 'R' && b.type === 'R') return 1;
      
      // Call előnyt élvez a check felett
      if (a.type === 'C' && b.type !== 'C' && b.type !== 'R') return -1;
      if (a.type !== 'C' && a.type !== 'R' && b.type === 'C') return 1;
      
      // Check előnyt élvez a fold felett
      if (a.type !== 'F' && b.type === 'F') return -1;
      if (a.type === 'F' && b.type !== 'F') return 1;
      
      return 0;
    });
  };
  
  /**
   * Tooltip megjelenítése a cella fölé húzott egérnél
   */
  const handleMouseEnter = (handId: HandId, event: React.MouseEvent) => {
    setTooltipInfo({
      handId,
      x: event.clientX,
      y: event.clientY
    });
  };
  
  /**
   * Tooltip elrejtése
   */
  const handleMouseLeave = () => {
    setTooltipInfo(null);
  };
  
  /**
   * Kéz ID előállítása két rank alapján
   * @param rank1 Első kártya rangja
   * @param rank2 Második kártya rangja
   * @returns Kéz ID (pl. "AA", "AKs", "AKo")
   */
  const getHandId = (rank1: string, rank2: string): HandId => {
    if (rank1 === rank2) {
      return `${rank1}${rank2}` as HandId;
    }
    
    const index1 = ranks.indexOf(rank1);
    const index2 = ranks.indexOf(rank2);
    
    if (index1 < index2) {
      return `${rank1}${rank2}s` as HandId;
    } else {
      return `${rank2}${rank1}o` as HandId;
    }
  };
  
  /**
   * Létrehoz egy gradienst a különböző akciók frekvenciái alapján
   * @param sortedActions Rendezett akciók listája
   * @returns CSS linear-gradient érték
   */
  const createGradientFromActions = (sortedActions: any[]) => {
    if (!sortedActions || sortedActions.length === 0) return '#f5f5f5';
    
    // Fordított sorrend - alulról felfelé töltjük a cellát
    // A nagyobb raise-ek alul jelennek meg
    const reversedActions = [...sortedActions].reverse();
    
    let totalPercent = 0;
    const gradientStops = [];
    
    // Minden akcióhoz létrehozunk egy gradiens megállót
    for (let i = 0; i < reversedActions.length; i++) {
      const action = reversedActions[i];
      const color = getActionColor(action.type as ActionType, action.amount, action.ev);
      const frequency = action.frequency * 100;
      
      // Az aktuális akció kezdő és végpontja
      const startPercent = totalPercent;
      const endPercent = totalPercent + frequency;
      totalPercent = endPercent;
      
      // Hozzáadjuk a gradiens megállókat
      gradientStops.push(`${color} ${startPercent}%`);
      gradientStops.push(`${color} ${endPercent}%`);
    }
    
    // Ha nem 100%, hozzáadunk egy üres részt
    if (totalPercent < 100) {
      gradientStops.push(`#f5f5f5 ${totalPercent}%`);
      gradientStops.push(`#f5f5f5 100%`);
    }
    
    return `linear-gradient(to top, ${gradientStops.join(', ')})`;
  };

  // Színmagyarázat létrehozása a raise értékek alapján
  const renderLegend = () => {
    return (
      <div className="mt-4 p-2 bg-gray-100 rounded-md text-xs flex flex-wrap gap-2 justify-center">
        {raiseAmounts.slice(0, 6).map((amount, index) => (
          <div key={`legend-raise-${index}`} className="flex items-center">
            <div className="w-4 h-4 mr-1" style={{ backgroundColor: getActionColor('R' as ActionType, amount, 0) }}></div>
            <span>Raise {currentBB > 0 ? (amount / currentBB).toFixed(1).replace('.0', '') : amount}BB</span>
          </div>
        ))}
        {raiseAmounts.length > 6 && (
          <div className="flex items-center">
            <div className="w-4 h-4 mr-1" style={{ backgroundColor: '#bbdefb' }}></div>
            <span>Kisebb raise-ek</span>
          </div>
        )}
        <div className="flex items-center">
          <div className="w-4 h-4 mr-1" style={{ backgroundColor: '#4caf50' }}></div>
          <span>Call</span>
        </div>
        <div className="flex items-center">
          <div className="w-4 h-4 mr-1" style={{ backgroundColor: '#ffeb3b' }}></div>
          <span>Check</span>
        </div>
        <div className="flex items-center">
          <div className="w-4 h-4 mr-1" style={{ backgroundColor: '#f5f5f5' }}></div>
          <span>Fold</span>
        </div>
      </div>
    );
  };
  
  return (
    <div className="w-full max-w-3xl mx-auto overflow-auto">
      <table className="w-full border-collapse">
        <thead>
          <tr>
            <th className="w-8 h-8 bg-gray-200"></th>
            {ranks.map((rank, index) => (
              <th key={`header-${rank}-${index}`} className="w-8 h-8 bg-gray-200 text-center font-bold">
                {rank}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {ranks.map((row, rowIndex) => (
            <tr key={`row-${row}-${rowIndex}`}>
              <th className="w-8 h-8 bg-gray-200 text-center font-bold">
                {row}
              </th>
              {ranks.map((col, colIndex) => {
                const handId = getHandId(row, col);
                const cellData = cellValues[handId];
                
                // Rendezett akciók a prioritás szerint
                const handData = {
                  played: cellData?.handData?.played || [],
                  actions: cellData?.actions || [],
                  evs: cellData?.handData?.evs || []
                };
                
                const sortedActions = sortActionsByPriority(handData);
                const gradientBackground = createGradientFromActions(sortedActions);
                
                // Cella típusának meghatározása (pair, suited, offsuit)
                let cellType = 'text-xs';
                if (row === col) {
                  cellType += ' font-bold'; // Pair
                } else if (rowIndex < colIndex) {
                  cellType += ' text-xs italic'; // Suited
                } else {
                  cellType += ' text-xs'; // Offsuit
                }
                
                return (
                  <motion.td 
                    key={`cell-${rowIndex}-${colIndex}-${handId}`}
                    className="w-8 h-8 text-center border border-gray-300 cursor-pointer select-none relative"
                    style={{ background: gradientBackground }}
                    onMouseEnter={(e) => handleMouseEnter(handId, e)}
                    onMouseLeave={handleMouseLeave}
                    // Csak az opacity-t animáljuk, nem a hátteret
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.3 }}
                  >
                    <div className={cellType}>
                      {handId}
                    </div>
                    {/* Legmagasabb frekvencia megjelenítése, ha van */}
                    {sortedActions.length > 0 && (
                      <div className="text-[10px] mt-1">
                        {Math.round(sortedActions[0].frequency * 100)}%
                      </div>
                    )}
                  </motion.td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
      
      {/* Jelmagyarázat a színekhez */}
      {renderLegend()}
      
      {/* Tooltip a részletes információkhoz */}
      {tooltipInfo && (
        <Tooltip 
          handId={tooltipInfo.handId} 
          position={{ x: tooltipInfo.x, y: tooltipInfo.y }} 
        />
      )}
    </div>
  );
};

export default ChartGrid;