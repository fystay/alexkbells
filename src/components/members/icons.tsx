export const ICON = "size-[22px] fill-none stroke-current stroke-[1.8]";
export const icons = {
  home: <path d="M4 11 12 4l8 7v9h-5v-6H9v6H4z" />,
  book: <path d="M4 8a3 3 0 0 1 3-3h10a3 3 0 0 1 3 3v9a3 3 0 0 1-3 3H7a3 3 0 0 1-3-3zM4 10h16M9 3v4M15 3v4M10 15l1.5 1.5L15 13" />,
  plan: (
    <>
      <circle cx="12" cy="12" r="8" />
      <path d="M12 4a8 8 0 0 1 8 8h-8z" />
    </>
  ),
  list: <path d="M8 6h12M8 12h12M8 18h12M4 6h.01M4 12h.01M4 18h.01" />,
  pin: (
    <>
      <path d="M12 21s7-7 7-12a7 7 0 0 0-14 0c0 5 7 12 7 12z" />
      <circle cx="12" cy="9" r="2.5" />
    </>
  ),
  chat: <path d="M4 5h16v11H9l-5 4z" />,
  card: <path d="M5.5 6h13A2.5 2.5 0 0 1 21 8.5v8a2.5 2.5 0 0 1-2.5 2.5h-13A2.5 2.5 0 0 1 3 16.5v-8A2.5 2.5 0 0 1 5.5 6zM3 10h18M7 15h4" />,
  help: <path d="M12 20.5a8.5 8.5 0 1 0 0-17 8.5 8.5 0 0 0 0 17zM9.6 9.5a2.5 2.5 0 1 1 3.4 2.3c-.6.3-1 .8-1 1.5v.4M12 16.8v.1" />,
  out: <path d="M14 4h4a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-4M10 16l-4-4 4-4M6 12h10" />,
  devices: <path d="M4 6h12v9H4zM2 18h16M19 9h3v9h-3z" />,
  person: (
    <>
      <circle cx="12" cy="8" r="4" />
      <path d="M4 20c1.5-4 4.5-6 8-6s6.5 2 8 6" />
    </>
  ),
  bell: <path d="M6 16V11a6 6 0 0 1 12 0v5l1.5 2h-15zM10 20a2 2 0 0 0 4 0" />,
  calendar: <path d="M4 8a3 3 0 0 1 3-3h10a3 3 0 0 1 3 3v9a3 3 0 0 1-3 3H7a3 3 0 0 1-3-3zM4 10h16M9 3v4M15 3v4" />,
  lock: <path d="M7 10h10a2 2 0 0 1 2 2v6a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2v-6a2 2 0 0 1 2-2zM8 10V7a4 4 0 0 1 8 0v3" />,
  coach: <path d="M9 8.5a3 3 0 1 1 6 0M8.2 8.5h7.6l1.7 9.2a2 2 0 0 1-2 2.3H8.5a2 2 0 0 1-2-2.3z" />,
  back: <path d="M15 5l-7 7 7 7" />,
  today: <path d="M9 8.5a3 3 0 1 1 6 0M8.2 8.5h7.6l1.7 9.2a2 2 0 0 1-2 2.3H8.5a2 2 0 0 1-2-2.3z" />,
  programme: <path d="M4 5.5A1.5 1.5 0 0 1 5.5 4h4A1.5 1.5 0 0 1 11 5.5v4A1.5 1.5 0 0 1 9.5 11h-4A1.5 1.5 0 0 1 4 9.5zM13 5.5A1.5 1.5 0 0 1 14.5 4h4A1.5 1.5 0 0 1 20 5.5v4a1.5 1.5 0 0 1-1.5 1.5h-4A1.5 1.5 0 0 1 13 9.5zM4 14.5A1.5 1.5 0 0 1 5.5 13h4a1.5 1.5 0 0 1 1.5 1.5v4A1.5 1.5 0 0 1 9.5 20h-4A1.5 1.5 0 0 1 4 18.5zM13 14.5a1.5 1.5 0 0 1 1.5-1.5h4a1.5 1.5 0 0 1 1.5 1.5v4a1.5 1.5 0 0 1-1.5 1.5h-4a1.5 1.5 0 0 1-1.5-1.5z" />,
  checkin: <path d="M7.5 4h9A2.5 2.5 0 0 1 19 6.5v11a2.5 2.5 0 0 1-2.5 2.5h-9A2.5 2.5 0 0 1 5 17.5v-11A2.5 2.5 0 0 1 7.5 4zM9 4.5V3h6v1.5M9 12l2 2 4-4M9 17h6" />,
  message: <path d="M4 5h16v11H9l-5 4z" />,
  send: <path d="M5 12h13M13 6l6 6-6 6" />,
  plus: <path d="M12 5v14M5 12h14" />,
  people: <path d="M9 4.5a3.5 3.5 0 1 1 0 7 3.5 3.5 0 0 1 0-7zM2.5 20c1-3.5 3.5-5.5 6.5-5.5s5.5 2 6.5 5.5M16 4.5a3.5 3.5 0 0 1 0 7M18 14.8c2 .7 3.2 2.5 3.8 5.2" />,
  inbox: <path d="M3 13l3-8h12l3 8v6H3zM3 13h5l1 2h6l1-2h5" />,
  sun: <path d="M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8zM12 2v2M12 20v2M2 12h2M20 12h2M5 5l1.4 1.4M17.6 17.6 19 19M5 19l1.4-1.4M17.6 6.4 19 5" />,
  money: <path d="M4 7h16v10H4zM12 9.5a2.5 2.5 0 1 0 0 5 2.5 2.5 0 0 0 0-5z" />,
  eye: <path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6S2 12 2 12zM12 9.5a2.5 2.5 0 1 0 0 5 2.5 2.5 0 0 0 0-5z" />,
};

export function Icon({ name, className = ICON }: { name: keyof typeof icons; className?: string }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className={className} strokeLinecap="round" strokeLinejoin="round">
      {icons[name]}
    </svg>
  );
}

export const MENU_ICON = "size-[19px] shrink-0 fill-none stroke-current stroke-[1.7]";
export const external = { target: "_blank", rel: "noopener noreferrer" } as const;
export const NEW_TAB = <span className="sr-only"> (opens in a new tab)</span>;
