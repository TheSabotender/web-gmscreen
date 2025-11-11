import { DiceTour } from "./DiceTour.js";

export class DiceTourMain extends DiceTour {
    constructor() {
        const steps = [
            {
                id: "goto-settings",
                title: game.i18n.localize("DICESONICE.TourMainTitleGotoSettings"),
                content: game.i18n.localize("DICESONICE.TourMainContentGotoSettings"),
                action: "click"
            },
            {
                id: "goto-configure",
                title: game.i18n.localize("DICESONICE.TourMainTitleGotoConfigure"),
                content: game.i18n.localize("DICESONICE.TourMainContentGotoConfigure"),
                action: "click"
            },
            {
                id: "goto-modulessettings",
                title: game.i18n.localize("DICESONICE.TourMainTitleGotoModulesSettings"),
                content: game.i18n.localize("DICESONICE.TourMainContentGotoModulesSettings"),
                action: "click"
            },
            {
                id: "goto-dicesonice",
                title: game.i18n.localize("DICESONICE.TourMainTitleGotoDiceSoNice"),
                content: game.i18n.localize("DICESONICE.TourMainContentGotoDiceSoNice"),
            },
            {
                id: "goto-dicesonice-settings",
                title: game.i18n.localize("DICESONICE.TourMainTitleGotoDiceSoNiceSettings"),
                content: game.i18n.localize("DICESONICE.TourMainContentGotoDiceSoNiceSettings"),
                action: "click"
            },
            {
                id: "show-3d-dice",
                title: game.i18n.localize("DICESONICE.TourMainTitleShow3DDice"),
                content: game.i18n.localize("DICESONICE.TourMainContentShow3DDice")
            },
            {
                id: "show-appearance",
                title: game.i18n.localize("DICESONICE.TourMainTitleShowAppearance"),
                content: game.i18n.localize("DICESONICE.TourMainContentShowAppearance"),
                action: "click",
                target: ".dice-so-nice a[data-tab=\"preferences\"]"
            },
            {
                id:"show-preferences",
                title: game.i18n.localize("DICESONICE.TourMainTitleShowPreferences"),
                content: game.i18n.localize("DICESONICE.TourMainContentShowPreferences"),
                action: "click",
                target: ".dice-so-nice a[data-tab=\"sfx\"]"
            },
            {
                id: "show-sfx",
                title: game.i18n.localize("DICESONICE.TourMainTitleShowSFX"),
                content: game.i18n.localize("DICESONICE.TourMainContentShowSFX"),
                action: "click",
                target: ".dice-so-nice a[data-tab=\"performance\"]"
            },
            {
                id: "show-performance",
                title: game.i18n.localize("DICESONICE.TourMainTitleShowPerformance"),
                content: game.i18n.localize("DICESONICE.TourMainContentShowPerformance"),
                action: "click",
                target: ".dice-so-nice a[data-tab=\"backup\"]"
            },
            {
                id: "show-backup",
                title: game.i18n.localize("DICESONICE.TourMainTitleShowBackup"),
                content: game.i18n.localize("DICESONICE.TourMainContentShowBackup")
            },
            {
                id: "end-tour",
                title: game.i18n.localize("DICESONICE.TourMainTitleEndTour"),
                content: game.i18n.localize("DICESONICE.TourMainContentEndTour")
            }
        ];

        for(let step of steps) {
            step.selector = DiceTourMain.getSelectorForStep(step);
        }

        super({
            title: "How to use Dice So Nice!",
            description: "Learn how to customize your 3D dice in this short tour of the module",
            canBeResumed: false,
            display: true,
            steps: steps
        });
    }
    /**
     * Override the DiceTour _preStep method to wait for the element to exists in the DOM
     */
    async _preStep() {
        switch (this.currentStep.id) {
            case "goto-settings":
                //start on the chat tab
                document.querySelector('a[data-tab="chat"],button[data-tab="chat"]').click();
                break;
            case "goto-dicesonice":
                //There is no native selector available for this step so we add something to identify the element with jQuery
                $("[data-tab=\"modules\"] h2:contains('Dice So Nice!')").addClass("dice-tour");
                break;
        }

        await super._preStep();
    }

    async _postStep() {
        if(!this.currentStep)
            return;
        switch (this.currentStep.id) {
            case "end-tour":
                //end the tour with a bang
                document.querySelector('.dice-so-nice button[data-test]').click();
            break;
        }
        await super._postStep();
    }

    static getSelectorForStep(step) {
        switch (step.id) {
            case "goto-settings":
                return "[data-tab=\"settings\"]";
            case "goto-configure":
                return "[data-action=\"configure\"]";
            case "goto-modulessettings":
                if(foundry.utils.isNewerVersion(game.version, "12.0"))
                    return ".category-tab[data-tab=\"dice-so-nice\"]";
                else
                    return ".category-filter [data-category=\"dice-so-nice\"]";
            case "goto-dicesonice":
                return "#client-settings form.categories div.scrollable";
            case "goto-dicesonice-settings":
                return "#client-settings [data-key=\"dice-so-nice.dice-so-nice\"]";
            case "show-3d-dice":
                return "#dice-configuration-canvas";
            case "show-appearance":
                return "#dsn-appearance-content";
            case "show-preferences":
                return ".dice-so-nice div.tab.active[data-tab=\"preferences\"]";
            case "show-sfx":
                return ".dice-so-nice div.tab.active[data-tab=\"sfx\"]";
            case "show-performance":
                return ".dice-so-nice div.tab.active[data-tab=\"performance\"]";
            case "show-backup":
                return ".dice-so-nice div.tab.active[data-tab=\"backup\"]";
            case "end-tour":
                return ".dice-so-nice div.tab.active[data-tab=\"backup\"]";
        }
        return null;
    }
}