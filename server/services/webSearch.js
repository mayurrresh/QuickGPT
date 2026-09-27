import axios from "axios";

const webSearch = async (query) => {
    try {
        const response = await axios.post(
            "https://api.tavily.com/search",
            {
                query,
                search_depth: "basic",
                topic: "general",
                max_results: 5,
                include_answer: false,
                include_raw_content: false,
            },
            {
                headers: {
                    Authorization: `Bearer ${process.env.TAVILY_API_KEY}`,
                    "Content-Type": "application/json",
                },
            }
        );

        return response.data.results || [];
    } catch (error) {
        console.error(
            "WEB SEARCH ERROR:",
            error.response?.data || error.message
        );

        throw new Error("Web search failed");
    }
};

export default webSearch;