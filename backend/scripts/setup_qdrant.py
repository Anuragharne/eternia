"""One-time initialization script for Qdrant Cloud collection and payload indexes."""

import sys
from backend.app.services.vector_service import vector_service


def main():
    print("Connecting to Qdrant Cloud to setup collection...")
    try:
        success = vector_service.setup_collection()
        if success:
            print(f"Collection '{vector_service.collection_name}' successfully configured!")
            # Get collection info
            info = vector_service.client.get_collection(collection_name=vector_service.collection_name)
            print(f"Collection status: {info.status}")
            print(f"Vector size: {info.config.params.vectors.size}")
            print(f"Distance metric: {info.config.params.vectors.distance}")
            return 0
        else:
            print("Failed to configure collection.")
            return 1
    except Exception as e:
        print(f"Error during Qdrant setup: {e}")
        return 1


if __name__ == "__main__":
    sys.exit(main())
