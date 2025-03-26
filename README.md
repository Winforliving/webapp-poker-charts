# Póker Chart Megjelenítő Webapp

Interaktív póker chart megjelenítő webapp HRC (Holdem Resources Calculator) exportált range-ek kezelésére, megjelenítésére és dinamikus navigációjára.

## Funkciók

- HRC (Holdem Resources Calculator) exportált ZIP fájlok importálása
- 13x13-as póker kéz rács megjelenítése
- Dinamikus színkódolás az akciók és frekvenciák alapján
- Részletes tooltip információk a kezekről
- Intuitív navigáció az akciók között

## Technológiák

- Next.js (React)
- TypeScript
- Zustand (State menedzsment)
- Framer Motion (Animációk)
- Tailwind CSS
- JSZip (ZIP fájl feldolgozás)

## Telepítés

```bash
# Clone a repozitórium
git clone https://github.com/Winforliving/webapp-poker-charts.git

# Függőségek telepítése
cd webapp-poker-charts
npm install

# Fejlesztői szerver indítása
npm run dev
```

## Használat

1. Nyisd meg a webappot a böngészőben (http://localhost:3000)
2. Töltsd fel a HRC ZIP exportált fájlodat
3. Válassz stack méretet
4. Navigálj az elérhető akciók között
5. Vizsgáld meg a kezeket a chart gridben

## Licenc

MIT