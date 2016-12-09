//
// export interface ITimeKeeper {
//
// }

export const TimeKeeper = (fps: number) => {
  // Timekeeper's timer: starts when first called, returns time since start
  const timer = () => (start => () => Date.now() - start)(Date.now());
  const observers = new Set([]);

  const tick = t => {
    const tock = timer();
    observers.forEach(o => o(t()/1000));
    setTimeout(() => tick(tock), 1000/fps);
  };

  // Start it up
  tick(timer());

  // Function to register time observers
  return {
    observe: o => observers.add(o),
    unobserve: uo => observers.delete(uo)
  };
};
