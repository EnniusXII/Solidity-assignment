// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

contract MovieVotes {

    enum VotingState { NotStarted, Ongoing, Finished }

    struct Poll {
        string[] movies;
        uint[] voteCount;
        address pollOwner;
        VotingState votingState;
        uint votingDeadline;
        address[] voters;
        mapping(address => bool) hasVoted;
        string winner;
    }

    address public contractOwner;
    uint public pollCounter;
    mapping(uint => Poll) public polls;
    bool public contractPaused;
    mapping(address => bool) public blacklist;

    event PollCreated(uint pollId, string[] movies, uint deadline);
    event VotingEnded(uint pollId, string winner);
    event FallbackCalled(address indexed accountAddress);
    event DonationReceived(address donor, uint amount, string message);

    error NotOwner(address caller);

    constructor() {
        contractOwner = msg.sender;
        pollCounter = 0;
    }

    modifier isContractOwner() {
        require(msg.sender == contractOwner, "Only contract owner can perform this action");
        _;
    }

    modifier inPollState(uint _pollId, VotingState _state) {
        require(polls[_pollId].votingState == _state, "Invalid state for this poll");
        _;
    }

    modifier notPaused() {
        require(!contractPaused, "Contract is paused");
        _;
    }

    modifier notBanned() {
        require(!blacklist[msg.sender], "You have been banned");
        _;
    }

    fallback() external {
        emit FallbackCalled(msg.sender);
        revert("Fallback function. Call a function that exists!");
    }

    receive() external payable {
        emit DonationReceived(msg.sender, msg.value, "Thank you for your donation!");
    }

    function pauseContract() external isContractOwner {
        require(!contractPaused, "Contract is already paused");
        contractPaused = true;
    }

    function unpauseContract() external isContractOwner {
        require(contractPaused, "Contract is not paused");
        contractPaused = false;
    }

    function banUser(address _accountAddress) external isContractOwner {
        blacklist[_accountAddress] = true;
    }

    function unBanUser(address _accountAddress) external isContractOwner {
        blacklist[_accountAddress] = false;
    }

    function createMovieVotes(string[] memory _movies, uint _durationInSeconds) external notPaused notBanned {
        require(_movies.length > 1, "Poll must have at least two movies");

        pollCounter++;

        Poll storage newPoll = polls[pollCounter];
        newPoll.pollOwner = msg.sender;
        newPoll.votingState = VotingState.Ongoing;
        newPoll.votingDeadline = block.timestamp + _durationInSeconds;
        newPoll.winner = "";

        newPoll.movies = _movies;
        newPoll.voteCount = new uint[](_movies.length);

        emit PollCreated(pollCounter, _movies, newPoll.votingDeadline);
    }

    function vote(uint _pollId, string memory _movie) external notPaused notBanned inPollState(_pollId, VotingState.Ongoing) {
        Poll storage poll = polls[_pollId];
        require(block.timestamp < polls[_pollId].votingDeadline, "Poll has ended");
        require(!poll.hasVoted[msg.sender], "You have already cast a vote");

        bool movieExists = false;
        for (uint i = 0; i < poll.movies.length; i++) {
            if (keccak256(bytes(poll.movies[i])) == keccak256(bytes(_movie))) {
                poll.voteCount[i] += 1;
                movieExists = true;
                break;
            }
        }

        require(movieExists, "Movie not found");
        poll.hasVoted[msg.sender] = true;
        poll.voters.push(msg.sender);

        assert(block.timestamp < polls[_pollId].votingDeadline);
    }

    function endMoviePoll(uint _pollId) external notPaused notBanned inPollState(_pollId, VotingState.Ongoing) {
        if(!(msg.sender == polls[_pollId].pollOwner)) {
            revert NotOwner(msg.sender);
        }

        Poll storage poll = polls[_pollId];
        poll.votingState = VotingState.Finished;
        determineWinner(_pollId);
    }

    function checkPollDeadline(uint _pollId) external notPaused notBanned inPollState(_pollId, VotingState.Ongoing) {
        Poll storage poll = polls[_pollId];
        require(block.timestamp >= poll.votingDeadline, "Poll deadline has not been reached yet");
        poll.votingState = VotingState.Finished;
        determineWinner(_pollId);
    }

    function determineWinner(uint _pollId) internal {
        Poll storage poll = polls[_pollId];
        uint maxVotes = 0;
        string memory winningMovie = "";

        for (uint i = 0; i < poll.movies.length; i++) {
            if (poll.voteCount[i] > maxVotes) {
                maxVotes = poll.voteCount[i];
                winningMovie = poll.movies[i];
            } else if (poll.voteCount[i] == maxVotes) {
                winningMovie = "There was a tie";
            }
        }

        poll.winner = winningMovie;
        emit VotingEnded(_pollId, winningMovie);
    }

    function getMovieVoteCounts(uint _pollId) external view returns (string[] memory, uint[] memory) {
        Poll storage poll = polls[_pollId];
        return (poll.movies, poll.voteCount);
    }

    function getPollWinner(uint _pollId) external view returns (string memory) {
        return polls[_pollId].winner;
    }
}