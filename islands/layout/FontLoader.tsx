export default function FontLoader() {
  return (
    <link
      rel="stylesheet"
      href="https://fonts.googleapis.com/css2?family=Montserrat:ital,wght@0,100..900;1,100..900&display=swap"
      media="all"
      onLoad={(e) => {
        (e.target as HTMLLinkElement).media = "all";
      }}
    />
  );
}

export function CourierFontLoader() {
  return (
    <link
      rel="stylesheet"
      href="https://fonts.googleapis.com/css2?family=Courier+Prime:ital,wght@0,400;0,700;1,400;1,700&display=swap"
      media="all"
      onLoad={(e) => {
        (e.target as HTMLLinkElement).media = "all";
      }}
    />
  );
}
