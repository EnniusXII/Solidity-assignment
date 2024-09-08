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

      it("Should start at a pollcounter of 0", async function() {
        const {movieVotes} = await deployMovieVotesFixture();

        expect(await movieVotes.pollCounter()).to.equal(0);
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

        await movieVotes.pauseContract();
        
        await expect(
          movieVotes.connect(user1).unpauseContract()
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

      it("Should not allow non-owner to ban and unban users", async function() {
        const {movieVotes, owner, user1} = await deployMovieVotesFixture();

        await expect(
          movieVotes.connect(user1).banUser(owner.address)
        ).to.be.revertedWith("Only contract owner can perform this action");
        
        await movieVotes.banUser(user1.address)

        await expect(
          movieVotes.connect(user1).unBanUser(user1.address)
        ).to.be.revertedWith("Only contract owner can perform this action");
      })
    })

    describe("Creating MovieVote polls", () => {
      it("Should allow users to create polls", async function() {
        const {movieVotes, user1, movies, duration} = await deployMovieVotesFixture();

        await movieVotes.connect(user1).createMovieVotes(movies, duration);

        expect((await movieVotes.polls(1)).pollOwner).to.equal(user1.address)
      })

      it("Should not allow creation of a poll with less than two movies", async function () {
        const {movieVotes, user1} = await deployMovieVotesFixture();

        await expect(
            movieVotes.connect(user1).createMovieVotes(["Avatar"], 60)
        ).to.be.revertedWith("Poll must have at least two movies");
      })

      it("Should not be possible to create a poll if contract is paused", async function() {
        const {movieVotes, movies, duration} = await deployMovieVotesFixture();

        await movieVotes.pauseContract();

        await expect(movieVotes.createMovieVotes(movies, duration)).to.be.revertedWith("Contract is paused");
      })

      it("Should not allow a banned user to start a poll", async function() {
        const {movieVotes, user1, movies, duration } = await deployMovieVotesFixture();
  
        await movieVotes.banUser(user1.address);
  
        await expect(
          movieVotes.connect(user1).createMovieVotes(movies, duration)
        ).to.be.revertedWith("You have been banned");
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

      it("Should not allow a user to vote twice", async function () {
        const {movieVotes, user1, movies, duration } = await deployMovieVotesFixture();

        await movieVotes.createMovieVotes(movies, duration);
        await movieVotes.connect(user1).vote(1, "Matrix");

        await expect(movieVotes.connect(user1).vote(1, "Matrix")).to.be.revertedWith("You have already cast a vote");
      });

      it("Should not allow a user to vote after deadline", async function () {
        const {movieVotes, movies, duration } = await deployMovieVotesFixture();

        await movieVotes.createMovieVotes(movies, duration);

        await ethers.provider.send("evm_increaseTime", [70]);

        await expect(movieVotes.vote(1, "Matrix")).to.be.revertedWith("Poll has ended");
      });

      it("Should not be possible to vote for a movie that is not in a poll", async function () {
        const {movieVotes, movies, duration } = await deployMovieVotesFixture();

        await movieVotes.createMovieVotes(movies, duration);

        await expect(movieVotes.vote(1, "Terminator")).to.be.revertedWith("Movie not found");
      });

      it("Should not be possible to vote if contract is paused", async function() {
        const {movieVotes, movies, duration} = await deployMovieVotesFixture();

        await movieVotes.createMovieVotes(movies, duration);

        await movieVotes.pauseContract();

        await expect(movieVotes.vote(1, "Avatar")).to.be.revertedWith("Contract is paused");
      })

      it("Should not allow a banned user to vote", async function() {
        const {movieVotes, user1, movies, duration } = await deployMovieVotesFixture();

        await movieVotes.createMovieVotes(movies, duration);
  
        await movieVotes.banUser(user1.address);
  
        await expect(
          movieVotes.connect(user1).vote(1, "Avatar")
        ).to.be.revertedWith("You have been banned");
      })
    })

    describe("Ending movie polls", () => {
      it("Should end a poll and determine the winner", async function() {
        const {movieVotes, user1, movies, duration} = await deployMovieVotesFixture();

        await movieVotes.createMovieVotes(movies, duration);
        await movieVotes.connect(user1).vote(1, "Matrix");

        await movieVotes.endMoviePoll(1);

        expect((await movieVotes.polls(1)).winner).to.equal("Matrix");
      })

      it("Should not allow non-poll owners to end the poll", async function () {
        const {movieVotes, user1, movies, duration} = await deployMovieVotesFixture();
  
        await movieVotes.createMovieVotes(movies, duration);
        await expect(movieVotes.connect(user1).endMoviePoll(1)).to.be.revertedWithCustomError(movieVotes, "NotOwner").withArgs(user1.address);
      })

      it("Should not be possible to end a poll if contract is paused", async function() {
        const {movieVotes, movies, duration} = await deployMovieVotesFixture();

        await movieVotes.createMovieVotes(movies, duration);

        await movieVotes.pauseContract();

        await expect(movieVotes.endMoviePoll(1)).to.be.revertedWith("Contract is paused");
      })

      it("Should not allow a banned user to end a poll", async function() {
        const {movieVotes, user1, movies, duration } = await deployMovieVotesFixture();

        await movieVotes.connect(user1).createMovieVotes(movies, duration);
  
        await movieVotes.banUser(user1.address);
  
        await expect(
          movieVotes.connect(user1).endMoviePoll(1)
        ).to.be.revertedWith("You have been banned");
      })
    })

    describe("checkPollDeadline", () => {
      it("Should allow checking poll deadline and determine winner if deadline is met", async function() {
        const {movieVotes, user1, movies, duration} = await deployMovieVotesFixture();

        await movieVotes.createMovieVotes(movies, duration);
        await movieVotes.connect(user1).vote(1, "Avatar");

        await ethers.provider.send("evm_increaseTime", [70]);
        await movieVotes.checkPollDeadline(1);

        expect((await movieVotes.polls(1)).votingState).to.equal(2);
      })

      it("Should not end poll if deadline is not met", async function() {
        const {movieVotes, movies, duration} = await deployMovieVotesFixture();

        await movieVotes.createMovieVotes(movies, duration);

        await expect(movieVotes.checkPollDeadline(1)).to.be.revertedWith("Poll deadline has not been reached yet");
      })

      it("Should not be possible to check poll deadline if contract is paused", async function() {
        const {movieVotes, movies, duration} = await deployMovieVotesFixture();

        await movieVotes.createMovieVotes(movies, duration);

        await movieVotes.pauseContract();

        await expect(movieVotes.checkPollDeadline(1)).to.be.revertedWith("Contract is paused");
      })

      it("Should not allow a banned user to check a poll deadline", async function() {
        const {movieVotes, user1, movies, duration } = await deployMovieVotesFixture();

        await movieVotes.createMovieVotes(movies, duration);
  
        await movieVotes.banUser(user1.address);
  
        await expect(
          movieVotes.connect(user1).checkPollDeadline(1)
        ).to.be.revertedWith("You have been banned");
      })
    })

    describe("determineWinner", () => {
      it("Should handle a tie correctly", async function () {
          const { movieVotes, user1, user2, movies, duration } = await deployMovieVotesFixture();
  
          await movieVotes.createMovieVotes(movies, duration);
          await movieVotes.connect(user1).vote(1, "Avatar");
          await movieVotes.connect(user2).vote(1, "Matrix");
  
          await movieVotes.endMoviePoll(1);
  
          expect((await movieVotes.getPollWinner(1))).to.equal("There was a tie");
      })
    })

    describe("getMovieVoteCounts", () => {
      it("Should allow users to get movie vote counts", async function () {
        const {movieVotes, user1, user2, movies, duration} = await deployMovieVotesFixture();

        await movieVotes.createMovieVotes(movies, duration);
        await movieVotes.connect(user1).vote(1, "Avatar");
        await movieVotes.connect(user2).vote(1, "Matrix");

        const [moviesList, voteCounts] = await movieVotes.getMovieVoteCounts(1);
        expect(moviesList[0]).to.equal("Avatar");
        expect(voteCounts[0]).to.equal(1);
    });
    })

    describe("getPollWinnr", () => {
      it("Should get the correct winner of poll", async function() {
        const {movieVotes, user1, movies, duration} = await deployMovieVotesFixture();

        await movieVotes.createMovieVotes(movies, duration);
        await movieVotes.connect(user1).vote(1, "Avatar");

        await movieVotes.endMoviePoll(1);

        expect((await movieVotes.getPollWinner(1))).to.equal("Avatar");
      })
    })
})