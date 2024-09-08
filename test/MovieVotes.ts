import hre, { ethers } from "hardhat";
import { expect } from "chai";

describe("MovieVotes", function () {
    async function deployMovieVotesFixture() {
        const [owner, user1, user2] = await ethers.getSigners();
        const movies = ["Avatar", "Matrix"];
        const duration = 60;

        const MovieVotes = await hre.ethers.getContractFactory("MovieVotes");
        const movieVotes = await MovieVotes.deploy();

        return { movieVotes, owner, user1, user2, movies, duration };
    }

    describe("Deployment", () => {
      it("Should set the correct contract owner", async function() {
        const {movieVotes, owner} = await deployMovieVotesFixture();

        expect(await movieVotes.contractOwner()).to.equal(await owner.getAddress());
      })
    })

    describe("Fallback and receive functions", () => {
      it("Should revert with the correct error when fallback is called", async function() {
          const { movieVotes, owner } = await deployMovieVotesFixture();

          await expect(
              owner.sendTransaction({ to: movieVotes.getAddress(), data: "0x1234" })
          ).to.be.revertedWith("Fallback function. Call a function that exists!");
      });

      it("Should emit with the correct message when receive is called", async function() {
        const { movieVotes, owner } = await deployMovieVotesFixture();

        await expect(
            owner.sendTransaction({ to: movieVotes.getAddress(), value: ethers.parseEther("1") })
        ).to.emit(movieVotes, "DonationReceived").withArgs(owner.address, ethers.parseEther("1"), "Thank you for your donation!" );
    });
  });

    describe("Pausing and unpausing contract", () => {
      it("Should allow owner to pause and unpause the contract", async function() {
        const {movieVotes} = await deployMovieVotesFixture();

        await movieVotes.pauseContract();

        expect(await movieVotes.contractPaused()).to.be.true;

        await movieVotes.unpauseContract();

        expect(await movieVotes.contractPaused()).to.be.false;
      })

      it("Should not allow non-owner to pause and unpause the contract", async function() {
        const {movieVotes, user1} = await deployMovieVotesFixture();

        await expect(
          movieVotes.connect(user1).pauseContract()
        ).to.be.revertedWith("Only contract owner can perform this action"); 
      })
    })

    describe("Banning and unbanning users", () => {
      it("Should allow owner to ban and unban users", async function() {
        const {movieVotes, user1} = await deployMovieVotesFixture();

        const user = user1.address;

        await movieVotes.banUser(user);

        expect(await movieVotes.blacklist(user)).to.be.true;

        await movieVotes.unBanUser(user);

        expect(await movieVotes.blacklist(user)).to.be.false;
      })

      it("Should not allow banned user to perform functions", async function() {
        const {movieVotes, user1, movies, duration } = await deployMovieVotesFixture();

        await movieVotes.banUser(user1.address);

        await expect(
          movieVotes.connect(user1).createMovieVotes(movies, duration)
        ).to.be.revertedWith("You have been banned");
      })
    })

    describe("Creating MovieVote polls", () => {
      it("Should allow users to create polls", async function() {
        const {movieVotes, user1, movies, duration} = await deployMovieVotesFixture();

        await movieVotes.connect(user1).createMovieVotes(movies, duration);

        expect((await movieVotes.polls(1)).pollOwner).to.equal(user1.address)
      })
    })

    describe("Voting", () => {
      it("Should allow user to vote on polls", async function() {
        const {movieVotes, user1, movies, duration } = await deployMovieVotesFixture();

        await movieVotes.connect(user1).createMovieVotes(movies, duration);

        await movieVotes.connect(user1).vote(1, "Avatar");

        const [movieNames, voteCounts] = await movieVotes.getMovieVoteCounts(1);
    
        expect(movieNames).to.deep.equal(["Avatar", "Matrix"]);
        expect(voteCounts).to.deep.equal([1, 0]);
      })
    })

    describe("Deployment", () => {
      it("Should set the correct contract owner", async function() {
        const {movieVotes, owner} = await deployMovieVotesFixture();

        expect(await movieVotes.contractOwner()).to.equal(await owner.getAddress());
      })
    })
    
    
})