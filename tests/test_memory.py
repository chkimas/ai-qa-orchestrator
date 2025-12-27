import uuid
from data.memory import TestMemory

def test_memory_persistence():
    # 1. Setup
    mem = TestMemory()
    run_id = str(uuid.uuid4())
    print(f"Testing Run ID: {run_id}")

    # 2. Simulate Customer Creating Data
    mem.create_run(run_id, "Test Order Workflow")
    mem.save_context(run_id, "order_id", "ORD-999", "customer")
    print("✅ Customer saved Order ID: ORD-999")

    # 3. Simulate Admin Reading Data (New connection)
    mem_admin = TestMemory() # Simulating a fresh instance
    retrieved_id = mem_admin.get_context(run_id, "order_id")

    # 4. Assert
    if retrieved_id == "ORD-999":
        print("✅ SUCCESS: Admin successfully retrieved Order ID from database.")
    else:
        print(f"❌ FAILURE: Expected ORD-999, got {retrieved_id}")

if __name__ == "__main__":
    test_memory_persistence()
