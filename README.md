# worldhappinessrankings

-	Instructions here are primarily demonstrated for use with VSCode but please adapt the steps accordingly for your IDE of choice. 
-	From the home page select ‘Clone Git Repository…” or if you do not have the standard splash page, hit ’ctrl + shift + p’  to bring up the command palette and enter:

      Git:Clone
      
-	In the repository name, copy and paste and hit enter with this link:

      https://github.com/jckh-dev/worldhappinessrankings.git 
      
-	Select the folder directory you would like to save the project in.
-	Open the project once VSCode gives you a notification when it has successfully cloned to your machine.
-	Open up a terminal box in VSCode and assuming you already have node and NPM installed, type the following:

      npm install
      
-	This will proceed to install all the required packages and get the project ready to run. 
-	Download the SQL dump here. This dump is fully customized with user profile and some limited user data. Import and set up the database in MySQL.
-	Make sure to adjust any environmental variables in knexfile.js to link to your MySQL. 
-	In VSCode, type the following to start the express application:

      npm start

-	Test with Postman if applicable.
