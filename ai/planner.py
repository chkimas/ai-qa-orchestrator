from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.output_parsers import PydanticOutputParser

from ai.models import TestPlan
from ai.prompts import PLANNER_SYSTEM_PROMPT
from configs.settings import settings

class TestPlanner:
    def __init__(self):
        # Initialize Gemini with low temperature for deterministic results
        self.llm = ChatGoogleGenerativeAI(
            model=settings.MODEL_NAME,
            google_api_key=settings.GOOGLE_API_KEY,
            temperature=0.0
        )
        self.parser = PydanticOutputParser(pydantic_object=TestPlan)

    def generate_plan(self, intent: str) -> TestPlan:
        """
        Converts natural language intent into a structured TestPlan.
        """
        # Create the prompt template with the format instructions
        prompt = ChatPromptTemplate.from_messages([
            ("system", PLANNER_SYSTEM_PROMPT),
            ("user", "{intent}\n\n{format_instructions}")
        ])

        # Chain: Prompt -> LLM -> JSON Parser
        chain = prompt | self.llm | self.parser

        try:
            # Execute the chain
            return chain.invoke({
                "intent": intent,
                "format_instructions": self.parser.get_format_instructions()
            })
        except Exception as e:
            # In production, we would log this to a file
            print(f"AI Planning Failed: {e}")
            raise e
