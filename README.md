# autha
A centralised TFA management system for teams and organsiations
## what's the point?
I created Autha because managing two-factor authentication amongst large teams can easily become very cumbersome and decentralised. Are your employees using Google Authenticator, Authy, Duo or SMS? It can very easily become messy and unorganised, when your team members are each using their own systems. Additionally, this can quickly spiral out of control, meaning your security is impacted, since hackers could trivially infiltrate one the devices that stores the TFA keys.
## how is it done?
Autha follows a trivial framework for setting up two-factor authentication for an unlimited number of arbitrary sites. It unites codes from both standardised TFA apps (Google Authenticator) and SMS, in order to have a centralised dashboard where users never have the TFA keys, only the individual codes that are generate based on these PSKs.

The workflow that is typically followed is this:
	1. Manager of the team registers for Autha.
	2. Employees sign up for Autha, and are added to a specific sub-team by their manager.
	3. Manager adds TFA keys (or adds an SMS account using a predefined phone #) for a certain site to the team's key database.
	4. Manager selects which sub-teams should have access to certain TFA codes.
	5. Employee logs into Autha, and authenticates using an SMS sent to their phone (the only time this is neccesary).
	6. Employee has a dashboard showing all of the codes that they can use. To receive a code, they must click 'reveal'.
	7. The manager is notified that a certain user accessed a code, and at what time, giving them complete information in the case of a hack.
