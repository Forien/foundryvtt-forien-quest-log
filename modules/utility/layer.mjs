/**
 * This registers very simple layer that is used to properly render
 * left menu buttons.
 */
export default class FQLLayer extends PlaceablesLayer {
    constructor() {
        super();
    }

    static get layerOptions() {
        return mergeObject(super.layerOptions, {
            objectClass: Note,
            sheetClass: NoteConfig,
            canDragCreate: false,
            zIndex: 180
        });
    }


    async draw() {
        super.draw();
    }


    /**
     * Registers a layer in Foundry canvas
     */
    static registerLayer() {
        const layers = mergeObject(Canvas.layers, {
            fql: FQLLayer
        });
        Object.defineProperty(Canvas, 'layers', {
            get: function () {
                return layers
            }
        });
    }

}

