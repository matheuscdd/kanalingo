export async function sleep(time) {
  return new Promise((resolve) => setTimeout(resolve, time))
}

export async function showNumberIncreasing(destination, initial, el, interval, increaser=1) { 
    for (let i = initial; i <= destination; i+=increaser) {
        el.innerText = `${i} PTS`;
        await sleep(interval); 
    }
    el.innerText = `${destination} PTS`;
}