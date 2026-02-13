# SC6107: Blockchain Development Fundamentals (Part 2)

## Development Project Documentation

**Academic Year:** 2025-26 | **Trimester:** 2

General Information 

**Project Overview**
In the Development Project, you are expected to design, architect, and develop an advanced decentralized application (dApp) or blockchain infrastructure component that demonstrates mastery of blockchain development principles, smart contract composition patterns, and DeFi protocols. This project accounts for 40% of your total course grade. 

**Team Composition**

* Work in groups of 2 to 4 students. Single-member groups require explicit instructor approval.
* Each member must contribute meaningfully to both implementation and presentation.
* Individual contributions will be tracked via GitHub commits. 



**Project Timeline** 

* **Weeks 1-6:** Full development lifecycle
* **Week 1-2:** Project selection, research, architecture design
* **Week 3-4:** Core implementation and contract development
* **Week 5:** Testing, security analysis, optimization
* **Week 6:** Final integration, documentation, and presentation preparation

**Development Resources** 

* **Ethereum Development:** Hardhat/Foundry documentation, OpenZeppelin Contracts library, EIPs.
* **DeFi Patterns:** Uniswap V2/V3, Compound Finance, Flashbots (MEV).
* **Security Resources:** SWC Registry, Consensys Best Practices, Trail of Bits guidelines.
* **Support Channels:** NTULearn course forum, Instructors (available after lectures).

---

### Project Options

*(Options 1-6 have been removed as requested)*

Option 7: EVM Transaction Debugger & Analyzer 

**Project in a Nutshell**
Build a sophisticated debugging and analysis tool for Ethereum transactions, providing detailed trace analysis, gas profiling, state diff visualization, and vulnerability detection. The tool should help developers understand complex contract interactions and optimize their code. 

**Background & Problem Statement**
Debugging smart contracts is significantly more challenging than traditional software:

* Limited visibility into execution flow.
* No traditional debugging tools (breakpoints, step-through).
* Gas cost optimization requires deep understanding of EVM opcodes.
* Complex contract interactions are hard to trace. 



Developers need tools that can:

* Provide detailed execution traces.
* Identify gas optimization opportunities.
* Detect common vulnerabilities.
* Visualize state changes across transactions. 



**Feature Requirements**

**Core Features:**

1. **Transaction Trace Analysis**
* Parse and display detailed execution traces.
* Show all internal transactions and calls.
* Display opcode-level execution (optional).
* Event log decoding and display. 




2. **Gas Profiling**
* Gas consumption breakdown by function.
* Identify gas-intensive operations.
* Compare gas usage across similar functions.
* Suggest optimization opportunities. 




3. **State Diff Visualization**
* Display all storage changes in transaction.
* Show before/after state for affected contracts.
* Visualize balance changes across addresses.
* Track token transfers (ERC-20/721/1155). 




4. **Vulnerability Detection**
* Static analysis for common vulnerabilities: Reentrancy, Integer overflow/underflow, Unchecked external calls, Access control issues.
* Integration with existing tools (Slither, Mythril). 


**Advanced Features (Bonus):**

* Real-time transaction monitoring and alerting.
* Contract interaction graph visualization.
* Historical trend analysis for gas optimization.
* Integration with popular development frameworks. 



**Technical Considerations**

* How to efficiently parse and store large transaction traces?
* How to present complex data in user-friendly format?
* How to balance depth of analysis with performance?
* How to keep vulnerability detection up-to-date? 



**Leading Projects for Reference**

* Tenderly ([https://tenderly.co/](https://tenderly.co/))
* Etherscan Transaction Analyzer
* Foundry/Hardhat debugging tools 



*(Option 8 has been removed as requested)*

---

Technical Requirements (All Projects) 

**Blockchain Platform**

* **Primary:** Ethereum (Mainnet fork, Sepolia, or Goerli testnet).
* **Alternative:** Other EVM-compatible chains with instructor approval.
* 
**Alternative:** Solana or other non-EVM platforms with instructor approval and justification. 



**Smart Contract Development**

* **Language:** Solidity 0.8.x (latest stable).
* **Development Framework:** Foundry or Hardhat.
* **Testing Framework:** Foundry/Forge or Hardhat/Chai.
* 
**Libraries:** OpenZeppelin Contracts 5.x. 



**Testing Requirements**

* **Minimum test coverage:** 80% line coverage.
* **Required test types:**
* Unit tests for all public/external functions.
* Integration tests for contract interactions.
* Invariant/fuzz testing for critical functions.
* Gas optimization tests. 





**Security Requirements**

* **Static Analysis:** Run Slither or similar tool, address critical findings.
* **Common Vulnerabilities:** Demonstrate protection against Reentrancy, Integer overflow/underflow, Front-running (where applicable), Access control bypass.
* **External Calls:** Proper checks-effects-interactions pattern.
* 
**Emergency Controls:** Pause mechanism for critical functions (if applicable). 



**Gas Optimization**

* Demonstrate gas optimization efforts: Use of appropriate data types, Storage vs. memory optimization, Loop optimization, Batch operations where possible.
* Document gas costs for main operations. 



**Frontend Requirements**

* **Framework:** React, Next.js, or similar modern framework.
* **Web3 Library:** ethers.js v6 or viem.
* **Wallet Connection:** Support MetaMask (minimum), WalletConnect (bonus).
* **UI/UX:** Clean, functional interface. Not required to be beautiful, but must be usable. Mobile-responsive (bonus). 



**Documentation Requirements**

* **README.md:** Comprehensive project overview.
* **Architecture documentation:** System design and component interaction.
* **Contract documentation:** NatSpec comments for all public functions.
* **Deployment guide:** Step-by-step instructions.
* 
**User guide:** How to interact with the application. 



---

Submission Requirements 

**GitHub Repository Structure**

* `contracts/` (Solidity smart contracts)
* `frontend/` (React/Next.js application)
* `test/`
* `scripts/` (deployment scripts)
* `docs/` (architecture.md, security-analysis.md, gas-optimization.md)
* 
`README.md` (comprehensive overview) 



**Critical Requirements**

1. **Individual Commits:** Each team member MUST commit using their own GitHub username. We track individual contributions through commit history.
2. **Commit Frequency:** Regular commits throughout the 6-week period.
3. **Branch Strategy (recommended):** `main` (production), `develop` (integration), and feature branches.
4. 
**Documentation:** Clear README, Architecture diagrams (Mermaid, Draw.io), API docs, Known limitations. 



**Presentation Requirements**

* **Format:** 5-minute presentation.
* **Content Structure:**
1. Introduction (1 min): Problem statement, Solution overview.
2. Technical Architecture (1 min): System design, Key trade-offs.
3. Live Demonstration (1 min): Core functionality, User flow.
4. Technical Deep Dive (1 min): Interesting challenges, Code snippets.
5. Results & Reflection (1 min): Learnings, Future improvements.


* **Deliverables:** Slide deck (PDF) submitted to NTULearn. Include links to demo, repo, and contracts. 



---

Evaluation Framework 

**Overall Grade Breakdown**

* **Technical Implementation (50%):** Quality, correctness, security, gas optimization, testing.
* **Technical Depth (15%):** Advanced patterns, integration of course topics, complexity.
* **Originality (10%):** Novel features, creative problem-solving.
* **Practicality (10%):** Real-world applicability, scalability.
* **UI/UX (10%):** Frontend functionality, user flow.
* 
**WOW Factor (5%):** Exceeds expectations. 



**Peer Evaluation (Moderating Factor)**

* Mandatory submission.
* Used to calculate individual grades from the team base grade.
* **Formula:**
* If Mean Rating > 8: Individual Grade = 100% of Team Grade.
* If 2 ≤ Mean Rating < 8: Individual Grade = (20% + Mean Rating * 10%) of Team Grade.
* If Mean Rating < 2: Case investigated. 





---

Important Dates & Deadlines 

* **Week 1:** Team registration.
* **Week 2:** Architecture document submission (recommended).
* **Week 3-4:** Core Development.
* **Week 5:** Testing coverage report (recommended).
* 
**Week 6 (Friday 11:59 PM SGT):** Final Submission (Code, Docs, Slides, Peer Eval). 


* 
**Presentations:** End of Week 6 (Feb 12, 2026). 



---

Academic Integrity 

* **Acceptable:** Using open-source libraries, referencing tutorials, AI tools (with full understanding and testing).
* **Unacceptable:** Copying code without attribution, submitting code you don't understand, plagiarism.
* 
**AI Tool Usage:** Permitted but must be documented, and you are responsible for security/correctness.
