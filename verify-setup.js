// Quick verification script

const fs = require('fs');
const path = require('path');

console.log('🔍 Verifying Scrabble Video System Setup...\n');

// Check if all required directories exist
const dirs = [
  'src/types',
  'src/schemas',
  'src/lib',
  'src/components/three',
  'src/components/overlays',
  'src/components/effects',
  'src/scenes',
  'src/compositions',
];

let allDirsExist = true;
dirs.forEach(dir => {
  const exists = fs.existsSync(dir);
  console.log(`${exists ? '✅' : '❌'} ${dir}`);
  if (!exists) allDirsExist = false;
});

// Check if key files exist
console.log('\n📄 Checking key files...\n');

const files = [
  'src/types/game-history.ts',
  'src/types/board-3d-data.ts',
  'src/schemas/video-config.schema.ts',
  'src/schemas/timing-script.schema.ts',
  'src/lib/procedural-textures.ts',
  'src/lib/game-converter.ts',
  'src/lib/audio-utils.ts',
  'src/lib/board-coordinates.ts',
  'src/lib/animation-utils.ts',
  'src/components/three/Lighting.tsx',
  'src/components/three/BoardBase.tsx',
  'src/components/three/BoardSquares.tsx',
  'src/components/three/Tile.tsx',
  'src/components/three/TileAnimated.tsx',
  'src/components/three/Rack.tsx',
  'src/components/three/WoodTable.tsx',
  'src/components/three/CameraController.tsx',
  'src/components/three/ScrabbleBoard.tsx',
  'src/components/overlays/Scorecard.tsx',
  'src/components/overlays/MoveNotation.tsx',
  'src/components/overlays/TurnIndicator.tsx',
  'src/components/effects/TileGlow.tsx',
  'src/components/effects/TilePlacementSound.tsx',
  'src/scenes/IntroScene.tsx',
  'src/scenes/BoardScene.tsx',
  'src/scenes/HighlightMoment.tsx',
  'src/scenes/OutroScene.tsx',
  'src/compositions/GameAnalysisVideo.tsx',
  'src/Root.tsx',
];

let allFilesExist = true;
files.forEach(file => {
  const exists = fs.existsSync(file);
  console.log(`${exists ? '✅' : '❌'} ${file}`);
  if (!exists) allFilesExist = false;
});

// Check package.json dependencies
console.log('\n📦 Checking dependencies...\n');

const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
const requiredDeps = [
  '@remotion/three',
  '@react-three/fiber',
  '@react-three/drei',
  'three',
  'zod',
  '@remotion/zod-types',
  '@remotion/transitions',
  '@remotion/media',
];

let allDepsInstalled = true;
requiredDeps.forEach(dep => {
  const installed = packageJson.dependencies[dep] !== undefined;
  console.log(`${installed ? '✅' : '❌'} ${dep}`);
  if (!installed) allDepsInstalled = false;
});

// Summary
console.log('\n' + '='.repeat(50));
console.log('\n📊 Summary:\n');
console.log(`Directories: ${allDirsExist ? '✅ All present' : '❌ Some missing'}`);
console.log(`Files: ${allFilesExist ? '✅ All present' : '❌ Some missing'}`);
console.log(`Dependencies: ${allDepsInstalled ? '✅ All installed' : '❌ Some missing'}`);

if (allDirsExist && allFilesExist && allDepsInstalled) {
  console.log('\n✨ Setup verification passed! Ready to create Scrabble analysis videos.\n');
  process.exit(0);
} else {
  console.log('\n⚠️  Setup verification found issues. Please review above.\n');
  process.exit(1);
}
