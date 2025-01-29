const express = require("express");
const axios = require("axios");
const cors = require("cors");
require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 5000;

// CORS configuration
const corsOptions = {
  origin: [
    'https://linkedin-profile-reviewer-1r9bkx2tv-majeds-projects-12d37331.vercel.app',
    'https://linkedin-profile-reviewer.vercel.app',
    'http://localhost:3000'
  ],
  methods: ['GET', 'POST'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
};

// Middleware
app.use(cors(corsOptions));
app.use(express.json());

// Health check endpoint
app.get('/', (req, res) => {
  res.json({ status: 'Server is running' });
});

// Route to analyze LinkedIn profile
app.post("/api/analyze", async (req, res) => {
  const { linkedinUrl } = req.body;

  if (!linkedinUrl) {
    return res.status(400).json({ error: "LinkedIn URL is required." });
  }

  try {
    console.log("Fetching profile data for URL:", linkedinUrl);

    // Fetch profile data from Proxycurl API
    const proxycurlResponse = await axios.get(
      "https://nubela.co/proxycurl/api/v2/linkedin",
      {
        headers: {
          Authorization: `Bearer ${process.env.PROXYCURL_API_KEY}`,
        },
        params: {
          linkedin_profile_url: linkedinUrl,
        },
      }
    );

    if (!proxycurlResponse.data) {
      console.error("No data received from Proxycurl API");
      return res.status(500).json({ error: "Failed to fetch LinkedIn profile data." });
    }

    console.log("Successfully fetched profile data");
    const profileData = proxycurlResponse.data;

    // Format profile data for Gemini API
    console.log("Formatting profile data...");
    const formattedProfile = formatProfileData(profileData);
    console.log("Formatted profile:", formattedProfile);

    // Generate feedback using Gemini API
    console.log("Generating feedback...");
    const feedback = await generateFeedback(formattedProfile);

    if (!feedback) {
      return res.status(500).json({ error: "No feedback was generated." });
    }

    console.log("Successfully generated feedback");
    res.json({ feedback });
  } catch (error) {
    console.error("Error in /api/analyze:", {
      message: error.message,
      response: error.response?.data,
      status: error.response?.status,
    });

    if (error.response?.status === 401) {
      return res.status(401).json({ error: "Invalid API key. Please check your configuration." });
    } else if (error.response?.status === 404) {
      return res.status(404).json({ error: "LinkedIn profile not found. Please check the URL." });
    } else if (error.response?.status === 429) {
      return res.status(429).json({ error: "API rate limit exceeded. Please try again later." });
    }

    res.status(500).json({
      error: "Failed to analyze LinkedIn profile.",
      details: error.message,
    });
  }
});

// Function to format profile data
function formatProfileData(profile) {
  const formattedExperiences = (profile.experiences || [])
    .map((job) => ({
      title: job.title || "N/A",
      company: job.company_name || "N/A",
      description: job.description || "",
      duration: job.duration || "",
      location: job.location || "",
      starts_at: job.starts_at ? `${job.starts_at.month}/${job.starts_at.year}` : "N/A",
      ends_at: job.ends_at ? `${job.ends_at.month}/${job.ends_at.year}` : "Present",
    }))
    .filter((job) => job.title && job.company)
    .slice(0, 5);

  const formattedEducation = (profile.educations || [])
    .map((edu) => ({
      degree: edu.degree_name || "N/A",
      school: edu.school_name || "N/A",
      field: edu.field_of_study || "",
      grade: edu.grade || "",
      dates: edu.starts_at && edu.ends_at ? `${edu.starts_at.year} - ${edu.ends_at.year}` : "",
    }))
    .filter((edu) => edu.degree && edu.school)
    .slice(0, 3);

  const formattedSkills = (profile.skills || [])
    .map((skill) => skill.skill_name)
    .filter(Boolean)
    .slice(0, 10);

  return `
PROFILE OVERVIEW
---------------
Full Name: ${profile.first_name || ""} ${profile.last_name || ""}
Headline: ${profile.headline || "N/A"}
Location: ${profile.location_name || "N/A"}
Industry: ${profile.industry || "N/A"}

SUMMARY
-------
${profile.summary || "No summary provided"}

PROFESSIONAL EXPERIENCE
-----------------------
${formattedExperiences
    .map(
      (job, index) =>
        `${index + 1}. ${job.title} at ${job.company}
   Duration: ${job.duration || `${job.starts_at} - ${job.ends_at}`}
   Location: ${job.location}
   ${job.description ? `Description: ${job.description}` : ""}`
    )
    .join("\n")}

EDUCATION
---------
${formattedEducation
    .map(
      (edu, index) =>
        `${index + 1}. ${edu.degree} from ${edu.school}
   Field: ${edu.field}
   ${edu.dates ? `Years: ${edu.dates}` : ""}
   ${edu.grade ? `Grade: ${edu.grade}` : ""}`
    )
    .join("\n")}

KEY SKILLS
----------
${formattedSkills.join(", ")}

PROFILE METRICS
--------------
Connections: ${profile.connections_count || "N/A"}
Recommendations: ${(profile.recommendations || []).length}
Articles Published: ${(profile.articles || []).length}
Certifications: ${(profile.certifications || []).length}
`;
}

// Function to generate feedback using Gemini API
async function generateFeedback(formattedProfile) {
  const geminiApiKey = process.env.GEMINI_API_KEY;
  const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiApiKey}`;

  const prompt = `As a LinkedIn profile expert, analyze the following profile and provide specific, actionable feedback. Focus on:
1. Profile completeness and professional presentation
2. Headline effectiveness and personal branding
3. Experience descriptions and impact metrics
4. Education and skills alignment with career goals
5. Overall profile optimization suggestions

Here's the profile to analyze:

${formattedProfile}

Please provide detailed, constructive feedback with specific examples and suggestions for improvement. Format your response in clear sections.`;

  const requestBody = {
    contents: [
      {
        parts: [
          {
            text: prompt
          }
        ]
      }
    ]
  };

  try {
    console.log('Sending request to Gemini API with URL:', geminiUrl);
    
    const geminiResponse = await axios.post(geminiUrl, requestBody, {
      headers: {
        'Content-Type': 'application/json'
      }
    });

    console.log('Gemini API Response Status:', geminiResponse.status);
    console.log('Gemini API Response Data:', JSON.stringify(geminiResponse.data, null, 2));

    const generatedContent = geminiResponse.data?.candidates?.[0]?.content?.parts?.[0]?.text;
    
    if (!generatedContent) {
      console.error('No content generated from Gemini API. Full response:', JSON.stringify(geminiResponse.data, null, 2));
      throw new Error('Failed to generate content from Gemini API');
    }

    return generatedContent;
  } catch (error) {
    console.error('Gemini API Error:', {
      message: error.message,
      status: error.response?.status,
      data: error.response?.data,
      url: geminiUrl
    });
    throw error;
  }
}

// Add a test endpoint to verify API keys
app.get('/api/test-keys', async (req, res) => {
  try {
    // Test ProxyCurl API
    const proxycurlTest = await axios.get('https://nubela.co/proxycurl/api/credit-balance', {
      headers: {
        Authorization: `Bearer ${process.env.PROXYCURL_API_KEY}`
      }
    });
    
    // Test Gemini API with a simple prompt
    const geminiTest = await axios.post(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`,
      {
        contents: [
          {
            parts: [
              {
                text: "Hello, this is a test."
              }
            ]
          }
        ]
      }
    );

    res.json({
      status: 'success',
      proxycurl: {
        status: 'working',
        credits: proxycurlTest.data
      },
      gemini: {
        status: 'working',
        response: geminiTest.data?.candidates?.[0]?.content?.parts?.[0]?.text
      }
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      proxycurl: error.response?.status === 401 ? 'invalid key' : 'working',
      gemini: error.response?.status === 400 ? 'invalid key' : 'working',
      error: error.message
    });
  }
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
