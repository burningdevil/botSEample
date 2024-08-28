import {
    TeamsActivityHandler,
    CardFactory,
    TurnContext,
    UserState,
    ConversationState,
    StatePropertyAccessor,
} from "botbuilder";

import * as ACData from "adaptivecards-templating";
import welcomeTemplate from "./cards/welcome.json";

export class TeamsBot extends TeamsActivityHandler {
    welcomeMsg: any;
    userLibraryAccessor: StatePropertyAccessor;
    conversationAccessor: StatePropertyAccessor;

    constructor(userState: UserState, conversationState: ConversationState) {
        super();

        this.userLibraryAccessor = userState.createProperty("userLibrary");

        this.onMessage(async (context, next) => {
            console.log("Running with Message Activity.");
            const removedMentionText = TurnContext.removeRecipientMention(
                context.activity
            );
            if (!removedMentionText) {
                await context.sendActivity({
                    text: "No text found. Please try again.",
                });
                await next();
                return;
            }
            const txt = removedMentionText.trim();
            const count = parseInt(txt) ?? 2;
            await this.sendWelcomeCard(context, count);

            // By calling next() you ensure that the next BotHandler is run.
            await next();
        });

        this.onMembersAdded(async (context, next) => {
            // only send when added to personal chat
            if (context.activity.conversation.conversationType === "personal") {
                const membersAdded = context.activity.membersAdded;
                for (let cnt = 0; cnt < membersAdded.length; cnt++) {
                    if (
                        membersAdded[cnt].id === context.activity.recipient.id
                    ) {
                        // need to check if the member is bot itself, otherwise will send twice
                        
                        await this.sendWelcomeCard(context, 2);
                        await this.sendWelcomeCard(context, 3);
                    }
                }
                await next();
            }
        });
    }

    // create welcome message
    async sendWelcomeCard(context, count) {  
        const data = this.createWelcomeData(count);
  
        const template = new ACData.Template(welcomeTemplate);
        const card = template.expand({
            $root: data,
        });

        try {
            await context.sendActivity({
                attachments: [CardFactory.adaptiveCard(card)],
            });
        } catch (error) {
            console.error(error);
        }
        await context.sendTraceActivity("Bot", "WELCOME Card sent", "INFO");
    }


    // return cards with count of cells
    createWelcomeData(cellCount: number) {
        const cards = [];
        for (let i = 0; i < 4; i++) {
            cards.push({
                title: i>=cellCount ? '' : `title for: ${i}`,
                desc: `desc for: ${i}`,
            });
        }
        

        return {
            title: "Hi There, Main title here",
            cells: cards,
        };
    }
}
