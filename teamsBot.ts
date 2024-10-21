import {
    TeamsActivityHandler,
    CardFactory,
    TurnContext,
    UserState,
    ConversationState,
    StatePropertyAccessor,
    ActionTypes,
    MessageFactory,
    TeamsInfo
} from "botbuilder";
import { getAllInc } from "./services/incidentService";
import {
    optionInc,
    invokeResponse,
    invokeTaskResponse,
    incidentListCard,
    invokeIncidentTaskResponse,
    refreshBotCard,
    selectResponseCard,
} from "./models/adaptiveCard";

import * as ACData from "adaptivecards-templating";
import welcomeTemplate from "./cards/welcome.json";
import welcomeData from './cards/welcome.data.json';

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
            const count = parseInt(txt);

            if (count) {
                await this.sendWelcomeCard(context, count);
                await next();
                return;
            }

            if (context.activity.text.includes("workflow")) {
                await this.startIncManagement(context);
                await next();
                return; 
            }

            if (context.activity.text != null) {
                const text = context.activity.text;

                if (text.includes("Card Actions")) {
                    const userCard = CardFactory.adaptiveCard(
                        this.adaptiveCardActions()
                    );
                    await context.sendActivity({
                        attachments: [userCard, userCard, userCard],
                        attachmentLayout: "carousel",
                    });
                } else if (text.includes("Suggested Actions")) {
                    const userCard = CardFactory.adaptiveCard(
                        this.SuggestedActionsCard()
                    );
                    await context.sendActivity({ attachments: [userCard] });
                } else if (
                    text.includes("Red") ||
                    text.includes("Blue") ||
                    text.includes("Yellow")
                ) {
                    // Create an array with the valid color options.
                    const validColors = ["Red", "Blue", "Yellow"];

                    // If the `text` is in the Array, a valid color was selected and send agreement.
                    if (validColors.includes(text)) {
                        await context.sendActivity(
                            `I agree, ${text} is the best color.`
                        );
                    }

                    await this.sendSuggestedActions(context);
                } else if (text.includes("ToggleVisibility")) {
                    const userCard = CardFactory.adaptiveCard(
                        this.ToggleVisibleCard()
                    );
                    await context.sendActivity({ attachments: [userCard] });
                } else if (text.includes("welcome")) {
                    await this.sendWelcomeCard(context, 1);
                } else {
                    await context.sendActivity(
                        "Please use one of these commands: **Card Actions** for  Adaptive Card Actions, **Suggested Actions** for Bot Suggested Actions and **ToggleVisibility** for Action ToggleVisible Card **workflow** for workflow dialogs"
                    );
                }
            }

            await this.SendDataOnCardActions(context);

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
        return welcomeData;
        // const cards = [];
        // for (let i = 0; i < 4; i++) {
        //     cards.push({
        //         title: i >= cellCount ? "" : `title for: ${i}`,
        //         desc: `desc for: ${i}`,
        //     });
        // }

        // return {
        //     title: "Hi There, Main title here",
        //     cells: cards,
        // };
    }

    /**
     *
     *
     * begin of Card Actions
     */

    // Sends the response on card action.submit
    async SendDataOnCardActions(context) {
        if (context.activity.value != null) {
            var reply = MessageFactory.text("");
            reply.text = `Data Submitted : ${context.activity.value.name}`;
            await context.sendActivity(MessageFactory.text(reply.text));
        }
    }

    async sendSuggestedActions(turnContext) {
        const cardActions = [
            {
                type: ActionTypes.ImBack,
                title: "Red",
                value: "Red",
            },
            {
                type: ActionTypes.ImBack,
                title: "Yellow",
                value: "Yellow",
            },
            {
                type: ActionTypes.ImBack,
                title: "Blue",
                value: "Blue",
            },
        ];

        var reply = MessageFactory.text("What is your favorite color ?");
        reply.suggestedActions = {
            actions: cardActions,
            to: [turnContext.activity.from.id],
        };
        await turnContext.sendActivity(reply);
    }

    // Adaptive Card Actions
    adaptiveCardActions = () => ({
        $schema: "http://adaptivecards.io/schemas/adaptive-card.json",
        type: "AdaptiveCard",
        version: "1.0",
        body: [
            {
                type: "TextBlock",
                text: "Adaptive Card Actions",
            },
        ],
        actions: [
            {
                type: "Action.OpenUrl",
                title: "Action Open URL",
                url: "https://adaptivecards.io",
            },
            {
                type: "Action.ShowCard",
                title: "Action Submit",
                card: {
                    type: "AdaptiveCard",
                    version: "1.5",
                    body: [
                        {
                            type: "Input.Text",
                            id: "name",
                            label: "Please enter your name:",
                            isRequired: true,
                            errorMessage: "Name is required",
                        },
                    ],
                    actions: [
                        {
                            type: "Action.Submit",
                            title: "Submit",
                        },
                    ],
                },
            },
            {
                type: "Action.ShowCard",
                title: "Action ShowCard",
                card: {
                    type: "AdaptiveCard",
                    version: "1.0",
                    body: [
                        {
                            type: "TextBlock",
                            text: "This card's action will show another card",
                        },
                    ],
                    actions: [
                        {
                            type: "Action.ShowCard",
                            title: "Action.ShowCard",
                            card: {
                                type: "AdaptiveCard",
                                body: [
                                    {
                                        type: "TextBlock",
                                        text: "**Welcome To New Card**",
                                    },
                                    {
                                        type: "TextBlock",
                                        text: "This is your new card inside another card",
                                    },
                                ],
                            },
                        },
                    ],
                },
            },
        ],
    });

    // Toggle Visible Card
    ToggleVisibleCard = () => ({
        $schema: "http://adaptivecards.io/schemas/adaptive-card.json",
        type: "AdaptiveCard",
        version: "1.0",
        body: [
            {
                type: "TextBlock",
                text: "**Action.ToggleVisibility example**: click the button to show or hide a welcome message",
            },
            {
                type: "TextBlock",
                id: "helloWorld",
                isVisible: false,
                text: "**Hello World!**",
                size: "extraLarge",
            },
        ],
        actions: [
            {
                type: "Action.ToggleVisibility",
                title: "Click me!",
                targetElements: ["helloWorld"],
            },
        ],
    });

    // Suggest Actions Card
    SuggestedActionsCard = () => ({
        $schema: "http://adaptivecards.io/schemas/adaptive-card.json",
        type: "AdaptiveCard",
        version: "1.0",
        body: [
            {
                type: "TextBlock",
                text: "**Welcome to bot Suggested actions** please use below commands.",
            },
            {
                type: "TextBlock",
                text: "please use below commands, to get response form the bot.",
            },
            {
                type: "TextBlock",
                text: "- Red \r- Blue \r - Yellow",
                wrap: true,
            },
        ],
    });

    /**
     * Begin of workflow dialogs
     */
    async onInvokeActivity(context) {
        console.log("Activity: ", context.activity.name);
        const user = context.activity.from;
        const action = context.activity.value.action;

        if (context.activity.name == "composeExtension/submitAction") {
            let choiceset = [];
            const incidents = await getAllInc();
            if (context.activity.value.data.msteams != null) {
                incidents.map((inc) => {
                    let choiceData = {
                        title: `Incident title: ${inc.title}, Created by: ${inc.createdBy.name}`,
                        value: inc.id,
                    };

                    choiceset.push(choiceData);
                });

                const incidentCard = CardFactory.adaptiveCard(
                    await incidentListCard(choiceset)
                );

                return invokeIncidentTaskResponse(
                    "Select incident",
                    incidentCard
                );
            }

            var incidentData = context.activity.value.data;
            const incident = incidents.find(
                (inc) => inc.id == incidentData.incidentId
            );
            var refreshCard = CardFactory.adaptiveCard(
                await refreshBotCard(incident)
            );
            await context.sendActivity({
                attachments: [refreshCard],
            });

            return invokeResponse(refreshCard);
        }

        if (context.activity.name == "composeExtension/fetchTask") {
            try {
                let choiceset = [];
                const allMembers = await (
                    await TeamsInfo.getMembers(context)
                ).filter((tm) => tm.aadObjectId);
                const incidents = await getAllInc();

                if (incidents.length == 0) {
                    const noIncidentFound = CardFactory.adaptiveCard({
                        version: "1.0.0",
                        type: "AdaptiveCard",
                        body: [
                            {
                                type: "TextBlock",
                                text: "No incident found.",
                                size: "large",
                                weight: "bolder",
                            },
                            {
                                type: "TextBlock",
                                text: "Please create a incident using bot.",
                                size: "medium",
                                weight: "bolder",
                            },
                        ],
                    });

                    return invokeTaskResponse(
                        "No Incident found",
                        noIncidentFound
                    );
                }

                incidents.map((inc) => {
                    let choiceData = {
                        title: `Incident title: ${inc.title}, Created by: ${inc.createdBy.name}`,
                        value: inc.id,
                    };

                    choiceset.push(choiceData);
                });

                const incidentCard = CardFactory.adaptiveCard(
                    await incidentListCard(choiceset)
                );

                return invokeIncidentTaskResponse(
                    "Select incident",
                    incidentCard
                );
            } catch (error) {
                if (error.code == "BotNotInConversationRoster") {
                    const botInstallationCard = CardFactory.adaptiveCard({
                        version: "1.0.0",
                        type: "AdaptiveCard",
                        body: [
                            {
                                type: "TextBlock",
                                text: "Looks like you haven't used bot in team/chat",
                            },
                        ],
                        actions: [
                            {
                                type: "Action.Submit",
                                title: "Continue",
                                data: {
                                    msteams: {
                                        justInTimeInstall: true,
                                    },
                                },
                            },
                        ],
                    });

                    return invokeTaskResponse(
                        "Bot is not installed",
                        botInstallationCard
                    );
                }
            }
        }

        if (context.activity.name === "adaptiveCard/action") {
            const action = context.activity.value.action;
            console.log("Verb: ", action.verb);
            const allMembers = await (
                await TeamsInfo.getMembers(context)
            ).filter((tm) => tm.aadObjectId);
            const responseCard = await selectResponseCard(
                context,
                user,
                allMembers
            );
            return invokeResponse(responseCard);
        }
    }

    async startIncManagement(context) {
        await context.sendActivity({
            attachments: [CardFactory.adaptiveCard(optionInc())],
        });
    }
}
