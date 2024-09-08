import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

const MovieVotesModule = buildModule("MovieVotesModule", (m) => {
  const movieVotes = m.contract("MovieVotes");

  return { movieVotes };
});

export default MovieVotesModule;