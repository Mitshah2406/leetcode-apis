const express = require("express");
const cors = require("cors");
const morgan = require("morgan");
const axios = require("axios");

const app = express();

app.use(cors());
app.use(express.json());
app.use(morgan("dev"));

// Health check route
app.get("/", (req, res) => {
    res.send("health check");
});



// Example request: http://localhost:3000/get-submission-calendar-data?username=your_username&year=2023
app.get("/get-submission-calendar-data", async (req, res) => {
    const { username, year } = req.query;

    if (!username) {
        return res.status(400).json({ error: "Username is required!" });
    }

    try {
        const query = `
          query userProfileCalendar($username: String!, $year: Int) {
            matchedUser(username: $username) {
              userCalendar(year: $year) {
                activeYears
                streak
                totalActiveDays
                dccBadges {
                  timestamp
                  badge {
                    name
                    icon
                  }
                }
                submissionCalendar
              }
            }
          }
        `;

        const variables = {
            username: username,
            year: year ? parseInt(year) : new Date().getFullYear()
        };

        const response = await axios.post(
            "https://leetcode.com/graphql",
            {
                query,
                variables
            },
            {
                headers: {
                    "Content-Type": "application/json",
                    "Referer": `https://leetcode.com/${username}/`
                }
            }
        );

        const userCalendar = response.data?.data?.matchedUser?.userCalendar;

        if (!userCalendar) {
            return res.status(404).json({ error: "User or calendar data not found!" });
        }

        // Parse and transform the submission calendar
        const submissionCalendar = JSON.parse(userCalendar.submissionCalendar);

        const transformedSubmissionCalendar = Object.entries(submissionCalendar).map(([timestamp, count]) => {
            const date = new Date(parseInt(timestamp) * 1000);
            return {
                date: date.toISOString().split('T')[0], // YYYY-MM-DD
                submissions: count
            };
        });

        // Build the final response
        const finalData = {
            activeYears: userCalendar.activeYears,
            streak: userCalendar.streak,
            totalActiveDays: userCalendar.totalActiveDays,
            dccBadges: userCalendar.dccBadges,
            submissionCalendar: transformedSubmissionCalendar
        };

        res.json(finalData);

    } catch (error) {
        console.error("Error fetching submission calendar data:", error.message);
        res.status(500).json({ error: "Internal Server Error" });
    }
});

// Server listener
app.listen(3000, () => {
    console.log("Server is running on port 3000");
});
