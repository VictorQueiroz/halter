tdd:
	./node_modules/.bin/sarg \
		--require babel-register \
		-w test,src \
		-r test \
		--ignore=test/history-fake.js \
		--ignore=test/react-components.js \
		--bail

test:
	./node_modules/.bin/sarg \
		--require babel-register \
		-r test \
		--ignore=test/history-fake.js \
		--ignore=test/react-components.js \
		--bail

release: test
	NODE_ENV=production ./node_modules/.bin/babel src -d lib && \
	echo 'success!'

.PHONY: release tdd test
