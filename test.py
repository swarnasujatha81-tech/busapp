import tensorflow as tf


print("TensorFlow version:", tf.__version__)

numbers = tf.constant([1, 2, 3, 4])
total = tf.reduce_sum(numbers)

print("Test tensor:", numbers.numpy())
print("Sum result:", total.numpy())
print("TensorFlow test completed successfully.")
