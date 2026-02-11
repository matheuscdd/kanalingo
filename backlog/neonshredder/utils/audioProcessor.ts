import { Note } from '../types';

export const analyzeAudio = async (file: File, audioContext: AudioContext, laneCount: number): Promise<{ buffer: AudioBuffer; notes: Note[] }> => {
  const arrayBuffer = await file.arrayBuffer();
  // Decode usually resumes context, but good to be safe
  if (audioContext.state === 'suspended') {
    await audioContext.resume();
  }
  const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);

  const notes: Note[] = [];
  const rawData = audioBuffer.getChannelData(0); // Use first channel
  const sampleRate = audioBuffer.sampleRate;
  
  // Algorithm configuration
  const windowSize = 0.05; // 50ms windows
  const samplesPerWindow = Math.floor(sampleRate * windowSize);
  
  // 1. Compute Energy Profile
  const energies: number[] = [];
  let maxEnergy = 0;

  for (let i = 0; i < rawData.length; i += samplesPerWindow) {
    let sum = 0;
    for (let j = 0; j < samplesPerWindow && i + j < rawData.length; j++) {
      const val = rawData[i + j];
      sum += val * val;
    }
    const rms = Math.sqrt(sum / samplesPerWindow);
    energies.push(rms);
    if (rms > maxEnergy) maxEnergy = rms;
  }

  // 2. Dynamic Thresholds
  const thresholdMultiplier = 1.15; 
  const minEnergyThreshold = Math.max(0.01, maxEnergy * 0.15); 
  
  const localGroupSize = 40; 

  for (let i = 0; i < energies.length; i++) {
    const start = Math.max(0, i - (localGroupSize / 2));
    const end = Math.min(energies.length, i + (localGroupSize / 2));
    let localSum = 0;
    for (let j = start; j < end; j++) {
      localSum += energies[j];
    }
    const localAverage = localSum / (end - start);
    
    // Peak detection logic
    if (energies[i] > localAverage * thresholdMultiplier && energies[i] > minEnergyThreshold) {
      
      const isLocalPeak = (i === 0 || energies[i] >= energies[i-1]) && 
                          (i === energies.length - 1 || energies[i] >= energies[i+1]);

      if (isLocalPeak) {
        const time = i * windowSize;
        const lastNote = notes[notes.length - 1];
        
        const minNoteDistance = 0.12; 
        
        if (!lastNote || (time - lastNote.time > minNoteDistance)) {
          // Lane assignment logic based on laneCount
          let lane = 0;
          if (lastNote) {
             const direction = Math.random() > 0.5 ? 1 : -1;
             // Ensure positive modulo result
             lane = (((lastNote.lane + direction) % laneCount) + laneCount) % laneCount;
             
             // Add some randomness for jumps
             if (Math.random() > 0.7) lane = Math.floor(Math.random() * laneCount);
          } else {
             lane = Math.floor(laneCount / 2); // Start in middle
          }
          
          notes.push({
            time: time,
            lane: lane,
            id: crypto.randomUUID(),
            hit: false,
            missed: false
          });
        }
      }
    }
  }

  // Fallback for quiet songs
  if (notes.length < (audioBuffer.duration / 2)) {
      console.log("Low note count detected, adding filler beats");
      const bpm = 120; 
      const beatInterval = 60 / bpm;
      for (let t = 2; t < audioBuffer.duration - 2; t += beatInterval) {
         if (!notes.find(n => Math.abs(n.time - t) < 0.2)) {
            notes.push({
                time: t,
                lane: Math.floor(Math.random() * laneCount),
                id: crypto.randomUUID(),
                hit: false,
                missed: false
            });
         }
      }
      notes.sort((a, b) => a.time - b.time);
  }

  console.log(`Generated ${notes.length} notes for ${audioBuffer.duration}s audio on ${laneCount} lanes.`);
  return { buffer: audioBuffer, notes };
};