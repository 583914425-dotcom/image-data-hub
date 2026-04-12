#!/usr/bin/env python3
"""
Server-side PyRadiomics feature extraction.
Usage: python3 extract_radiomics.py <image_path> <mask_path>
Output: JSON array of {featureClass, featureName, featureValue}
"""

import sys
import json
import logging

logging.disable(logging.CRITICAL)

def main():
    if len(sys.argv) != 3:
        print(json.dumps({"error": "Usage: extract_radiomics.py <image> <mask>"}))
        sys.exit(1)

    image_path = sys.argv[1]
    mask_path = sys.argv[2]

    try:
        from radiomics import featureextractor
        import radiomics

        radiomics.setVerbosity(60)

        settings = {
            "binWidth": 25,
            "resampledPixelSpacing": None,
            "interpolator": "sitkBSpline",
            "enableCExtensions": True,
            "geometryTolerance": 1e-3,
        }

        extractor = featureextractor.RadiomicsFeatureExtractor(**settings)
        extractor.enableAllFeatures()

        result = extractor.execute(image_path, mask_path)

        features = []
        for key, value in result.items():
            if key.startswith("original_"):
                parts = key.split("_", 2)
                if len(parts) == 3:
                    _, feature_class, feature_name = parts
                    try:
                        fval = float(value)
                        if fval == fval:
                            features.append({
                                "featureClass": feature_class,
                                "featureName": feature_name,
                                "featureValue": fval,
                            })
                    except (TypeError, ValueError):
                        pass

        print(json.dumps({"features": features, "count": len(features)}))

    except Exception as e:
        print(json.dumps({"error": str(e)}))
        sys.exit(1)

if __name__ == "__main__":
    main()
