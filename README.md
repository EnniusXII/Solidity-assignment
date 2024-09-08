# Project Summary: Movie Voting Smart Contract

In this project, I have developed a smart contract using Solidity that allows users to vote on their favorite movies from a predefined list. The voting process is open for a specific duration, after which the contract tallies the votes and determines the winning movie. The contract also includes functionality for creating polls, casting votes, checking the poll deadline, and ending a poll to reveal the winner. Each poll is tied to the user who created it.

**Key Features of the Contract:**
1. **Poll Creation**: Users can create movie polls by providing a list of movies and setting a voting duration. A unique poll ID is assigned to each poll, and it is stored on-chain.
   
2. **Voting**: Users can cast their votes on a movie within the specified voting duration. Each user can only vote once per poll, and the contract ensures that users do not vote multiple times or after the poll has ended.

3. **Vote Counting and Winner Announcement**: Once the voting period ends, the contract counts the votes and announces the winning movie. If there's a tie, the result is recorded as a tie.

4. **Access Control**: The contract includes functionality for banning users, pausing/unpausing the contract, and checking poll deadlines. Only the contract owner has the authority to ban users and pause the contract.

5. **Event Emission**: Important events like poll creation, the end of voting, donations, and fallback calls are logged using events.

**Technological Features:**
- **Structs and Enums**: The contract uses an `enum` to define the state of the poll and a `struct` to store poll details such as movies, vote counts, and the poll owner.
  
- **Mappings and Arrays**: Mappings are used to track whether a user has voted and whether a user is banned. Arrays are used to store movie titles and their corresponding vote counts.

- **Constructor and Modifiers**: The contract includes a constructor to set the contract owner, and custom modifiers ensure that only authorized users (like the contract owner or poll creator) can perform certain actions. Modifiers also check if the contract is paused or if the user is banned.

- **Error Handling and Gas Optimization**: The contract uses custom errors to save gas and provides specific error messages (e.g., `NotOwner`). It also utilizes `require`, `assert`, and `revert` for validations, and includes a `fallback` and `receive` function to handle ether transactions.

**Testing and Deployment:**
- The contract has been rigorously tested using Hardhat, Chai, and Ethers. Tests cover all major functionalities including poll creation, voting, ending polls, and handling edge cases such as paused contracts and banned users.
- Test coverage exceeds 90%, ensuring the reliability and robustness of the contract.
  
**Gas Optimizations and Security Measures:**
1. **External Functions**: I leveraged external functions wherever possible, as they are more gas-efficient than public functions when handling external calls. This optimization reduces the overall gas usage of the contract.

2. **Pause and Unpause Feature**: I implemented a pause and unpause feature as a security measure, allowing the contract owner to halt operations in case of unforeseen events or vulnerabilities. This helps protect the contract from potential misuse or attacks.

3. **Ban and Unban Users**: The contract includes functionality to ban and unban users, ensuring that malicious actors can be restricted from interacting with the contract. This security measure helps maintain the integrity of the voting process.

This smart contract meets all the requirements outlined for both the basic (G) and advanced (VG) levels of the assignment.


**Link to verified contract on sepolia network**: https://sepolia.etherscan.io/address/0x113AC6B2AAa76F50198Ed1AF2b4e4b592488CEE7#code