#!/usr/bin/env node

/**
 * Timing Script Editor Utility
 *
 * Common operations for editing timing scripts:
 * - Shift all cues after a certain time by X seconds
 * - Scale timing (speed up/slow down entire script or sections)
 * - Insert gaps between cues
 */

const fs = require('fs');
const path = require('path');

function loadTimingScript(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  return JSON.parse(content);
}

function saveTimingScript(filePath, script) {
  fs.writeFileSync(filePath, JSON.stringify(script, null, 2) + '\n');
}

// Shift all cues after a certain time by X seconds
function shiftAfter(script, afterTime, shiftSeconds) {
  return {
    ...script,
    cues: script.cues.map(cue => {
      if (cue.time > afterTime) {
        return { ...cue, time: cue.time + shiftSeconds };
      }
      return cue;
    })
  };
}

// Scale timing in a range (multiply all times by factor)
function scaleRange(script, startTime, endTime, scaleFactor) {
  return {
    ...script,
    cues: script.cues.map(cue => {
      if (cue.time >= startTime && cue.time <= endTime) {
        const offset = cue.time - startTime;
        return { ...cue, time: startTime + (offset * scaleFactor) };
      } else if (cue.time > endTime) {
        // Shift subsequent cues by the change in the range
        const rangeChange = (endTime - startTime) * (scaleFactor - 1);
        return { ...cue, time: cue.time + rangeChange };
      }
      return cue;
    })
  };
}

// Insert gap at a specific time
function insertGap(script, atTime, gapSeconds) {
  return shiftAfter(script, atTime, gapSeconds);
}

// Print timing script in readable format
function printScript(script) {
  console.log('\nTiming Script:');
  console.log('─'.repeat(80));
  script.cues.forEach((cue, i) => {
    const timeStr = cue.time.toFixed(2).padEnd(8);
    const actionStr = cue.action.padEnd(12);
    const turnStr = cue.turnIndex !== undefined ? `turn ${cue.turnIndex}`.padEnd(10) : ''.padEnd(10);
    const squareStr = cue.targetSquare ? `(${cue.targetSquare.row},${cue.targetSquare.col})` : '';
    console.log(`${String(i).padStart(3)}. ${timeStr}s  ${actionStr}  ${turnStr}  ${squareStr}`);
  });
  console.log('─'.repeat(80));
}

// CLI interface
const args = process.argv.slice(2);

if (args.length < 2) {
  console.log(`
Timing Script Editor

Usage:
  node edit-timing.js <input-file> <command> [args...] [--output <output-file>]

Commands:
  shift-after <time> <seconds>
      Shift all cues after <time> by <seconds>
      Example: node edit-timing.js timing.json shift-after 30 5
               (shifts everything after 30s by +5 seconds)

  scale-range <start> <end> <factor>
      Scale timing in a range by multiplier
      Example: node edit-timing.js timing.json scale-range 10 20 0.5
               (makes 10-20s range half speed, shifts rest accordingly)

  insert-gap <time> <seconds>
      Insert a gap at specific time
      Example: node edit-timing.js timing.json insert-gap 15 3
               (inserts 3 second gap at 15s mark)

  print
      Print timing script in readable format
      Example: node edit-timing.js timing.json print

Options:
  --output <file>    Save to different file (default: overwrites input)
  --dry-run         Print changes without saving
  `);
  process.exit(1);
}

const inputFile = args[0];
const command = args[1];

// Parse options
let outputFile = inputFile;
let dryRun = false;
for (let i = 2; i < args.length; i++) {
  if (args[i] === '--output' && i + 1 < args.length) {
    outputFile = args[i + 1];
    i++;
  } else if (args[i] === '--dry-run') {
    dryRun = true;
  }
}

try {
  let script = loadTimingScript(inputFile);
  let modified = false;

  switch (command) {
    case 'shift-after': {
      const afterTime = parseFloat(args[2]);
      const shiftSeconds = parseFloat(args[3]);
      if (isNaN(afterTime) || isNaN(shiftSeconds)) {
        throw new Error('Invalid arguments for shift-after');
      }
      console.log(`Shifting cues after ${afterTime}s by ${shiftSeconds}s`);
      script = shiftAfter(script, afterTime, shiftSeconds);
      modified = true;
      break;
    }

    case 'scale-range': {
      const startTime = parseFloat(args[2]);
      const endTime = parseFloat(args[3]);
      const scaleFactor = parseFloat(args[4]);
      if (isNaN(startTime) || isNaN(endTime) || isNaN(scaleFactor)) {
        throw new Error('Invalid arguments for scale-range');
      }
      console.log(`Scaling ${startTime}s-${endTime}s by ${scaleFactor}x`);
      script = scaleRange(script, startTime, endTime, scaleFactor);
      modified = true;
      break;
    }

    case 'insert-gap': {
      const atTime = parseFloat(args[2]);
      const gapSeconds = parseFloat(args[3]);
      if (isNaN(atTime) || isNaN(gapSeconds)) {
        throw new Error('Invalid arguments for insert-gap');
      }
      console.log(`Inserting ${gapSeconds}s gap at ${atTime}s`);
      script = insertGap(script, atTime, gapSeconds);
      modified = true;
      break;
    }

    case 'print':
      printScript(script);
      break;

    default:
      throw new Error(`Unknown command: ${command}`);
  }

  if (modified) {
    printScript(script);

    if (dryRun) {
      console.log('\n[DRY RUN] Changes not saved');
    } else {
      saveTimingScript(outputFile, script);
      console.log(`\n✓ Saved to ${outputFile}`);
    }
  }

} catch (error) {
  console.error('Error:', error.message);
  process.exit(1);
}
