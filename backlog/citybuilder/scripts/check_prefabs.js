try {
  await import('../prefabs/index.js');
  console.log('All prefabs validated successfully.');
} catch (err) {
  console.error('Prefab validation error:', err && err.stack ? err.stack : err);
  process.exit(1);
}
