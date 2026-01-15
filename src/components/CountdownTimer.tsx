import { useState, useEffect } from "react";

interface TimeLeft {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
}

const CountdownTimer = () => {
  const getTargetDateMs = (nowMs: number) => {
    const now = new Date(nowMs);
    const year = now.getFullYear();

    // Party starts Feb 21st at 21:00 CET (UTC+01:00)
    const thisYearTarget = new Date(`${year}-02-21T21:00:00+01:00`).getTime();

    // If the date already passed, count down to next year's Feb 21st.
    return thisYearTarget > nowMs
      ? thisYearTarget
      : new Date(`${year + 1}-02-21T21:00:00+01:00`).getTime();
  };

  const calculateTimeLeft = (): TimeLeft => {
    const nowMs = Date.now();
    const targetMs = getTargetDateMs(nowMs);
    const difference = targetMs - nowMs;

    if (difference <= 0) {
      return { days: 0, hours: 0, minutes: 0, seconds: 0 };
    }

    return {
      days: Math.floor(difference / (1000 * 60 * 60 * 24)),
      hours: Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
      minutes: Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60)),
      seconds: Math.floor((difference % (1000 * 60)) / 1000),
    };
  };

  const [timeLeft, setTimeLeft] = useState<TimeLeft>(calculateTimeLeft());

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft(calculateTimeLeft());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const timeBlocks = [
    { value: timeLeft.days, label: "Days" },
    { value: timeLeft.hours, label: "Hours" },
    { value: timeLeft.minutes, label: "Minutes" },
    { value: timeLeft.seconds, label: "Seconds" },
  ];

  return (
    <div className="flex items-center justify-center gap-3 md:gap-6">
      {timeBlocks.map((block, index) => (
        <div key={block.label} className="flex items-center gap-3 md:gap-6">
          <div className="text-center">
            <div className="glass-card px-4 py-3 md:px-6 md:py-4 min-w-[70px] md:min-w-[90px]">
              <span className="font-display text-3xl md:text-5xl font-bold gold-text">
                {String(block.value).padStart(2, "0")}
              </span>
            </div>
            <span className="text-muted-foreground text-xs md:text-sm mt-2 block uppercase tracking-wider">
              {block.label}
            </span>
          </div>
          {index < timeBlocks.length - 1 && (
            <span className="text-primary text-2xl md:text-4xl font-light mb-6">:</span>
          )}
        </div>
      ))}
    </div>
  );
};

export default CountdownTimer;
