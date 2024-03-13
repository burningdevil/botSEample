import {
  TeamsActivityHandler,
  CardFactory,
  TurnContext,
  AdaptiveCardInvokeValue,
  AdaptiveCardInvokeResponse,
} from "botbuilder";

import normal from "./card.json";
import multipe from "./multiple.json";
import sample from './sample.json';


export class TeamsBot extends TeamsActivityHandler {
  constructor() {
    super();
    this.onMessage(async (context, next) => {
      console.log("Running with Message Activity.");
      const removedMentionText = TurnContext.removeRecipientMention(context.activity);
      const txt = removedMentionText.toLowerCase().replace(/\n|\r/g, "").trim();
      
      if (txt === "s") {
        await context.sendActivity({
          attachments: [this.createAdaptiveCard(sample)]
        });
      } else if (txt === "n") {
        await context.sendActivity({
          attachments: [this.createAdaptiveCard(normal)]
        });
      } else if (txt === "m") {
        await context.sendActivity({
          attachments: [this.createAdaptiveCard(multipe)]
        });
      } else {
        await context.sendActivity(txt);
      }
      
      // By calling next() you ensure that the next BotHandler is run.
      await next();
    });

    this.onMembersAdded(async (context, next) => {
      const membersAdded = context.activity.membersAdded;
      for (let cnt = 0; cnt < membersAdded.length; cnt++) {
        if (membersAdded[cnt].id) {
          await context.sendActivity(
            `Hi there! I'm a Teams bot that will echo what you said to me.`
          );
          break;
        }
      }
      await next();
    });
  }

  createAdaptiveCard(card) {
    const c = CardFactory.adaptiveCard(card);
    return c;
  }
}
