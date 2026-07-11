function CountryFlag({ code }: { code: string }) {
  const flagUrl = `https://flagcdn.com/w640/${code.toLowerCase()}.png`;

  return (
    <span
      style={{
        backgroundImage: `url(${flagUrl})`,
      }}
    ></span>
  );
}

export default CountryFlag;
